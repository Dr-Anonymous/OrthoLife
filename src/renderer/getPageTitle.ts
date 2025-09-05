import type { PageContext } from "vike/types";

export { getPageTitle };

function getPageTitle(pageContext: PageContext): string {
  const title =
    // For static titles (defined in the `+title` config)
    pageContext.config.title ||
    // For dynamic titles (defined in the `data()` hook)
    pageContext.data?.title ||
    "Vike App";
  return title;
}
