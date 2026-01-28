import HeaderWrapper from '@/components/layout/HeaderWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import ArticleHero from '@/components/sections/resources/article/ArticleHero'
import ArticleContent from '@/components/sections/resources/article/ArticleContent'
import AuthorBio from '@/components/sections/resources/article/AuthorBio'
import ArticleCTA from '@/components/sections/resources/article/ArticleCTA'
import RelatedArticles from '@/components/sections/resources/article/RelatedArticles'
import { getArticleBySlug } from '@/lib/articles'
import { getLanguageFromParams } from '@/lib/language'
import { notFound } from 'next/navigation'

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>
}) {
  const { lang, slug } = await params
  getLanguageFromParams({ lang }) // validate locale; Header/Footer use path
  const article = getArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  const relatedArticlesWithImages = article.relatedArticles.map((related) => {
    const fullArticle = getArticleBySlug(related.slug)
    return {
      ...related,
      image: fullArticle?.image || related.image,
    }
  })

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderWrapper />
      <main className="flex-grow">
        <ArticleHero article={article} />
        <ArticleContent article={article} />
        <AuthorBio author={article.author} />
        <ArticleCTA />
        <RelatedArticles articles={relatedArticlesWithImages} />
      </main>
      <FooterWrapper />
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>
}) {
  const { slug } = await params
  const article = getArticleBySlug(slug)

  if (!article) {
    return {
      title: 'Article Not Found | ScandiCommerce',
      description: 'The article you are looking for could not be found.',
    }
  }

  return {
    title: `${article.title} | ScandiCommerce`,
    description: article.description,
  }
}
