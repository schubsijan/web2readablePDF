declare global {

  interface ArticleMetadata {
    title?: string;
    byline?: string;
    publishedTime?: string;
    excerpt?: string;
    siteName?: string;
  }

  interface ArticleData {
    metadata: ArticleMetadata;
    readableHtml: string;
    cleanHtml: string;
  }
}

export { };
