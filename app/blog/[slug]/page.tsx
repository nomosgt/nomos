import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostHero } from "@/components/blog/post-hero";
import { PostBody } from "@/components/blog/post-body";
import { RelatedPosts } from "@/components/blog/related-posts";
import { PostCTA } from "@/components/blog/post-cta";
import {
  getAllPublishedPosts,
  getPostBySlug,
  getRelatedPosts,
} from "@/lib/blog/posts";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const posts = await getAllPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post · NOMOS GT" };
  return {
    title: `${post.title} · NOMOS GT`,
    description: post.excerpt || undefined,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const related = await getRelatedPosts(post, 3);

  return (
    <>
      <PostHero post={post} />
      <PostBody post={post} related={related} />
      <RelatedPosts posts={related} />
      <PostCTA />
    </>
  );
}
