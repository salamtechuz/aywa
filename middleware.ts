export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inbox/:path*",
    "/calendar/:path*",
    "/crm/:path*",
    "/sales/:path*",
    "/subscriptions/:path*",
    "/inventory/:path*",
    "/purchase/:path*",
    "/logistics/:path*",
    "/accounting/:path*",
    "/hr/:path*",
    "/projects/:path*",
    "/manufacturing/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
