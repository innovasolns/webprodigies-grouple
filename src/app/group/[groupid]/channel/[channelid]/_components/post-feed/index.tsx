"use client"

import { Loader } from "@/components/global/loader"
import { useChannelPage } from "@/hooks/channels"

import InfiniteScrollObserver from "@/components/global/infinite-scroll"
import { PaginatedPosts } from "../paginates-posts"
import { PostCard } from "./post-card"

type PostFeedProps = {
  channelid: string
  userid: string
}

type Post = {
  id: string
  createdAt: Date
  title: string | null
  htmlContent: string | null
  jsonContent: string | null
  content: string
  authorId: string
  channelId: string
  likes: {
    id: string
    userId: string
  }[]
  channel: {
    name: string
  }
  _count: {
    likes: number
    comments: number
  }
  author: {
    firstname: string
    lastname: string
    image: string | null
  }
}

export const PostFeed = ({ channelid, userid }: PostFeedProps) => {
  const { data, isLoading, isError } = useChannelPage(channelid)

  if (isLoading) {
    return <Loader loading={true}>Loading posts...</Loader>
  }

  if (isError) {
    return <div>Error loading posts</div>
  }

  const posts = data?.posts as Post[] | undefined

  if (!posts || posts.length === 0) {
    return <div>No posts found</div>
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          channelname={post.channel.name}
          title={post.title || ""}
          html={post.htmlContent || ""}
          username={`${post.author.firstname} ${post.author.lastname}`}
          userimage={post.author.image || ""}
          likes={post._count.likes}
          comments={post._count.comments}
          postid={post.id}
          likedUser={post.likes[0]?.userId}
          userid={userid}
          likeid={post.likes[0]?.id}
        />
      ))}
      <InfiniteScrollObserver
        action="POSTS"
        loading="POST"
        identifier={channelid}
        paginate={posts.length}
      >
        <PaginatedPosts userid={userid} />
      </InfiniteScrollObserver>
    </>
  )
}
