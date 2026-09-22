import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api",
        "/dashboard",
        "/history",
        "/settings",
        "/invite",
        "/notifications",
        "/onboarding",
        "/recipient",
        "/caregiver",
      ],
    },
  };
}
