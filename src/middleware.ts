import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher(["/group(.*)"])

export default clerkMiddleware(async (auth, req) => {
  const host = req.headers.get("host")
  const reqPath = req.nextUrl.pathname
  const origin = req.nextUrl.origin

  // Protect routes
  if (isProtectedRoute(req)) {
    try {
      await auth().protect()
    } catch (error) {
      console.error("Authentication error:", error)
      return NextResponse.redirect(new URL("/sign-in", origin))
    }
  }

  // Handle custom domains
  if (host && !host.includes("localhost") && reqPath.includes("/group")) {
    try {
      const domainResponse = await fetch(`${origin}/api/domain?host=${host}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!domainResponse.ok) {
        throw new Error("Domain verification failed")
      }

      const domainData = await domainResponse.json()
      if (domainData.status === 200 && domainData.domain) {
        return NextResponse.rewrite(
          new URL(reqPath, `https://${domainData.domain}`),
        )
      }
    } catch (error) {
      console.error("Domain verification error:", error)
      return NextResponse.redirect(new URL("/error", origin))
    }
  }
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
