// https://vike.dev/onRenderClient
import { hydrateRoot } from "react-dom/client";
import { PageShell } from "./PageShell";
import type { OnRenderClientAsync } from "vike/types";

const onRenderClient: OnRenderClientAsync = async (
  pageContext
): ReturnType<OnRenderClientAsync> => {
  const { Page } = pageContext;

  // This render() hook only supports SSR, see https://vike.dev/render-modes for how to modify render() to support SPA
  if (!Page)
    throw new Error("My render() hook expects pageContext.Page to be defined");

  const container = document.getElementById("react-root");
  if (!container) throw new Error("DOM element #react-root not found");

  hydrateRoot(
    container,
    <PageShell pageContext={pageContext}>
      <Page />
    </PageShell>
  );
};

export default onRenderClient;
