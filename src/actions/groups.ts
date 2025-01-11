"use server"
import { CreateGroupSchema } from "@/components/forms/create-group/schema"
import { client } from "@/lib/prisma"
import axios from "axios"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"
import { onAuthenticatedUser } from "./auth"

export const onGetAffiliateInfo = async (id: string) => {
  try {
    const affiliateInfo = await client.affiliate.findUnique({
      where: {
        id,
      },
      select: {
        Group: {
          select: {
            User: {
              select: {
                firstname: true,
                lastname: true,
                image: true,
                id: true,
                stripeId: true,
              },
            },
          },
        },
      },
    })

    if (affiliateInfo) {
      return { status: 200, user: affiliateInfo }
    }

    return { status: 404 }
  } catch (error) {
    return { status: 400 }
  }
}

export const onCreateNewGroup = async (
  userId: string,
  data: z.infer<typeof CreateGroupSchema>,
) => {
  try {
    const created = await client.user.update({
      where: {
        id: userId,
      },
      data: {
        group: {
          create: {
            ...data,
            affiliate: {
              create: {},
            },
            member: {
              create: {
                userId: userId,
              },
            },
            channel: {
              create: [
                {
                  id: uuidv4(),
                  name: "general",
                  icon: "general",
                },
                {
                  id: uuidv4(),
                  name: "announcements",
                  icon: "announcement",
                },
              ],
            },
          },
        },
      },
      select: {
        id: true,
        group: {
          select: {
            id: true,
            channel: {
              select: {
                id: true,
              },
              take: 1,
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    })

    if (created) {
      return {
        status: 200,
        data: created,
        message: "Group created successfully",
      }
    }
  } catch (error) {
    return {
      status: 400,
      message: "Oops! group creation failed, try again later",
    }
  }
}

export const onGetGroupInfo = async (groupid: string) => {
  try {
    const user = await onAuthenticatedUser()
    const group = await client.group.findUnique({
      where: {
        id: groupid,
      },
    })

    if (group)
      return {
        status: 200,
        group,
        groupOwner: user.id === group.userId ? true : false,
      }

    return { status: 404 }
  } catch (error) {
    return { status: 400 }
  }
}

export const onGetUserGroups = async (id: string) => {
  try {
    const groups = await client.user.findUnique({
      where: {
        id,
      },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            icon: true,
            channel: {
              where: {
                name: "general",
              },
              select: {
                id: true,
              },
            },
          },
        },
        membership: {
          select: {
            Group: {
              select: {
                id: true,
                icon: true,
                name: true,
                channel: {
                  where: {
                    name: "general",
                  },
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (groups && (groups.group.length > 0 || groups.membership.length > 0)) {
      return {
        status: 200,
        groups: groups.group,
        members: groups.membership,
      }
    }

    return {
      status: 404,
    }
  } catch (error) {
    return { status: 400 }
  }
}

export const onGetGroupChannels = async (groupid: string) => {
  try {
    const channels = await client.channel.findMany({
      where: {
        groupId: groupid,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return { status: 200, channels }
  } catch (error) {
    return { status: 400, message: "Oops! something went wrong" }
  }
}

export const onGetGroupSubscriptions = async (groupid: string) => {
  try {
    const subscriptions = await client.subscription.findMany({
      where: {
        groupId: groupid,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const count = await client.members.count({
      where: {
        groupId: groupid,
      },
    })

    if (subscriptions) {
      return { status: 200, subscriptions, count }
    }
  } catch (error) {
    return { status: 400 }
  }
}

export const onGetAllGroupMembers = async (groupid: string) => {
  try {
    const user = await onAuthenticatedUser()
    const members = await client.members.findMany({
      where: {
        groupId: groupid,
        NOT: {
          userId: user.id,
        },
      },
      include: {
        User: true,
      },
    })

    if (members && members.length > 0) {
      return { status: 200, members }
    }
  } catch (error) {
    return { status: 400, message: "Oops something went wrong" }
  }
}

export const onSearchGroups = async (
  mode: "GROUPS" | "POSTS",
  query: string,
  paginate?: number,
) => {
  try {
    if (mode === "GROUPS") {
      const fetchedGroups = await client.group.findMany({
        where: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        take: 6,
        skip: paginate || 0,
      })

      if (fetchedGroups) {
        if (fetchedGroups.length > 0) {
          return {
            status: 200,
            groups: fetchedGroups,
          }
        }

        return { status: 404 }
      }
    }
    if (mode === "POSTS") {
    }
  } catch (error) {
    return { status: "400", message: "Oops! something went wrong" }
  }
}

export const onUpDateGroupSettings = async (
  groupid: string,
  type:
    | "IMAGE"
    | "ICON"
    | "NAME"
    | "DESCRIPTION"
    | "JSONDESCRIPTION"
    | "HTMLDESCRIPTION",
  content: string,
  path: string,
) => {
  try {
    // Validate input
    if (!groupid || !type || !content) {
      return {
        status: 400,
        message: "Missing required parameters",
      }
    }

    // Validate content based on type
    if (type === "NAME" && content.length > 100) {
      return {
        status: 400,
        message: "Group name must be less than 100 characters",
      }
    }

    if (
      (type === "DESCRIPTION" ||
        type === "JSONDESCRIPTION" ||
        type === "HTMLDESCRIPTION") &&
      content.length > 5000
    ) {
      return {
        status: 400,
        message: "Description must be less than 5000 characters",
      }
    }

    // Use transaction for atomic updates
    const result = await client.$transaction(async (tx) => {
      const updateData: Record<string, string> = {}

      switch (type) {
        case "IMAGE":
          updateData.thumbnail = content
          break
        case "ICON":
          updateData.icon = content
          break
        case "DESCRIPTION":
          updateData.description = content
          break
        case "NAME":
          updateData.name = content
          break
        case "JSONDESCRIPTION":
          updateData.jsonDescription = content
          break
        case "HTMLDESCRIPTION":
          updateData.htmlDescription = content
          break
        default:
          throw new Error("Invalid update type")
      }

      const updatedGroup = await tx.group.update({
        where: { id: groupid },
        data: updateData,
      })

      if (!updatedGroup) {
        throw new Error("Failed to update group settings")
      }

      return updatedGroup
    })

    // Revalidate specific paths based on update type
    const revalidatePaths = [
      path,
      `/group/${groupid}`,
      `/group/${groupid}/settings`,
    ]

    revalidatePaths.forEach((p) => revalidatePath(p))

    return {
      status: 200,
      message: "Group settings updated successfully",
    }
  } catch (error) {
    console.error("Group settings update error:", error)
    return {
      status: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update group settings",
    }
  }
}

export const onGetExploreGroup = async (category: string, paginate: number) => {
  try {
    const groups = await client.group.findMany({
      where: {
        category,
        NOT: {
          description: null,
          thumbnail: null,
        },
      },
      take: 6,
      skip: paginate,
    })

    if (groups && groups.length > 0) {
      return { status: 200, groups }
    }

    return {
      status: 404,
      message: "No groups found for this category",
    }
  } catch (error) {
    return {
      status: 400,
      message: "Oops! something went wrong",
    }
  }
}

export const onGetPaginatedPosts = async (
  identifier: string,
  paginate: number,
) => {
  try {
    const user = await onAuthenticatedUser()
    const posts = await client.post.findMany({
      where: {
        channelId: identifier,
      },
      skip: paginate,
      take: 2,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        channel: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            firstname: true,
            lastname: true,
            image: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: {
            userId: user.id!,
          },
          select: {
            userId: true,
            id: true,
          },
        },
      },
    })

    if (posts && posts.length > 0) return { status: 200, posts }

    return { status: 404 }
  } catch (error) {
    return { status: 400 }
  }
}

export const onUpdateGroupGallery = async (
  groupid: string,
  content: string,
) => {
  try {
    const mediaLimit = await client.group.findUnique({
      where: {
        id: groupid,
      },
      select: {
        gallery: true,
      },
    })

    if (mediaLimit && mediaLimit?.gallery.length < 6) {
      await client.group.update({
        where: {
          id: groupid,
        },
        data: {
          gallery: {
            push: content,
          },
        },
      })
      revalidatePath(`/about/${groupid}`)
      return { status: 200 }
    }

    return {
      status: 400,
      message: "Looks like your gallery has the maximum media allowed",
    }
  } catch (error) {
    return { status: 400, message: "Looks like something went wrong" }
  }
}

export const onJoinGroup = async (groupid: string) => {
  try {
    const user = await onAuthenticatedUser()
    const member = await client.group.update({
      where: {
        id: groupid,
      },
      data: {
        member: {
          create: {
            userId: user.id,
          },
        },
      },
    })
    if (member) {
      return { status: 200 }
    }
  } catch (error) {
    return { status: 404 }
  }
}

export const onGetAffiliateLink = async (groupid: string) => {
  try {
    const affiliate = await client.affiliate.findUnique({
      where: {
        groupId: groupid,
      },
      select: {
        id: true,
      },
    })

    return { status: 200, affiliate }
  } catch (error) {
    return { status: 400, message: "Oops! soomething went wrong" }
  }
}

export const onVerifyAffilateLink = async (id: string) => {
  try {
    const link = await client.affiliate.findUnique({
      where: {
        id,
      },
    })

    if (link) {
      return { status: 200 }
    }

    return { status: 404 }
  } catch (error) {
    return { status: 400 }
  }
}

export const onGetUserFromMembership = async (membershipid: string) => {
  try {
    const member = await client.members.findUnique({
      where: {
        id: membershipid,
      },
      select: {
        User: true,
      },
    })

    if (member) {
      return { status: 200, member }
    }
  } catch (error) {
    return { status: 400 }
  }
}

export const onGetAllUserMessages = async (recieverId: string) => {
  try {
    const sender = await onAuthenticatedUser()
    const messages = await client.message.findMany({
      where: {
        senderid: {
          in: [sender.id!, recieverId],
        },
        recieverId: {
          in: [sender.id!, recieverId],
        },
      },
    })

    if (messages && messages.length > 0) {
      return { status: 200, messages }
    }

    return { status: 404 }
  } catch (error) {
    return { status: 400, message: "Oops something went wrong" }
  }
}

export const onSendMessage = async (
  recieverid: string,
  messageid: string,
  message: string,
) => {
  try {
    const user = await onAuthenticatedUser()
    const newMessage = await client.user.update({
      where: {
        id: user.id,
      },
      data: {
        message: {
          create: {
            id: messageid,
            recieverId: recieverid,
            message,
          },
        },
      },
    })

    if (newMessage) {
      return { status: 200 }
    }
  } catch (error) {
    return { status: 400 }
  }
}

export const onGetPostInfo = async (postid: string) => {
  try {
    const user = await onAuthenticatedUser()
    const post = await client.post.findUnique({
      where: {
        id: postid,
      },
      include: {
        channel: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            firstname: true,
            lastname: true,
            image: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: {
            userId: user.id!,
          },
          select: {
            userId: true,
            id: true,
          },
        },
        comments: true,
      },
    })

    if (post) return { status: 200, post }

    return { status: 404, message: "No post found" }
  } catch (error) {
    return { status: 400, message: "Oops! something went wrong" }
  }
}

export const onGetPostComments = async (postid: string) => {
  try {
    const comments = await client.comment.findMany({
      where: {
        postId: postid,
        replied: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
        _count: {
          select: {
            reply: true,
          },
        },
      },
    })

    if (comments && comments.length > 0) {
      return { status: 200, comments }
    }
  } catch (error) {
    return { status: 400 }
  }
}

export const onGetCommentReplies = async (commentid: string) => {
  try {
    const replies = await client.comment.findUnique({
      where: {
        id: commentid,
      },
      select: {
        reply: {
          include: {
            user: true,
          },
        },
      },
    })

    if (replies && replies.reply.length > 0) {
      return { status: 200, replies: replies.reply }
    }

    return { status: 404, message: "No replies found" }
  } catch (error) {
    return { status: 400, message: "Oops something went wrong" }
  }
}

export const onGetDomainConfig = async (groupId: string) => {
  try {
    //check if domain exists
    const domain = await client.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        domain: true,
      },
    })

    if (domain && domain.domain) {
      //get config status of domain
      const status = await axios.get(
        `https://api.vercel.com/v10/domains/${domain.domain}/config?teamId=${process.env.TEAM_ID_VERCEL}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      )

      return { status: status.data, domain: domain.domain }
    }

    return { status: 404 }
  } catch (error) {
    console.log(error)
    return { status: 400 }
  }
}

export const onAddCustomDomain = async (groupid: string, domain: string) => {
  try {
    const addDomainHttpUrl = `https://api.vercel.com/v10/projects/${process.env.PROJECT_ID_VERCEL}/domains?teamId=${process.env.TEAM_ID_VERCEL}`
    //we now insert domain into our vercel project
    //we make an http request to vercel
    const response = await axios.post(
      addDomainHttpUrl,
      {
        name: domain,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (response) {
      const newDomain = await client.group.update({
        where: {
          id: groupid,
        },
        data: {
          domain,
        },
      })

      if (newDomain) {
        return {
          status: 200,
          message: "Domain successfully added",
        }
      }
    }

    return { status: 404, message: "Group not found" }
  } catch (error) {
    console.log(error)
    return { status: 400, message: "Oops something went wrong" }
  }
}
