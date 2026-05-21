import { useEffect } from "react";
import { applySeo, SeoPayload } from "../lib/seo";

export function Seo(props: SeoPayload) {
  useEffect(() => {
    applySeo(props);
  }, [props.title, props.description, props.canonicalPath, props.image, props.robots, JSON.stringify(props.jsonLd)]);
  return null;
}
