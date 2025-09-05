import type { PageContext } from "vike/types";
import { data } from "./+data";

export default function title(pageContext: PageContext<typeof data>) {
  const { post } = pageContext.data;
  return post.title;
}
