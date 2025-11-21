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
    html: string;
    contentElement?: HTMLElement;
  }
}

export { };
