import type { Metadata } from "next";
import { BlogHero } from "@/components/blog/blog-hero";
import { BlogGrid } from "@/components/blog/blog-grid";
import { getAllPublishedPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog · NOMOS GT",
  description:
    "Análises técnicas sobre reforma tributária, jurisprudência, cases e atualizações do mundo fiscal.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getAllPublishedPosts();
  return (
    <>
      <BlogHero />
      <BlogGrid posts={posts} />
    </>
  );
}
