import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Defensive polyfill for browser extensions that improperly assume SVG element className is a string on mouse events
if (typeof window !== 'undefined' && 'SVGAnimatedString' in window) {
  const proto = (window as unknown as { SVGAnimatedString: { prototype: Record<string, unknown> } }).SVGAnimatedString.prototype;
  if (!proto.indexOf) {
    proto.indexOf = function (searchString: string, position?: number) {
      return this.baseVal ? this.baseVal.indexOf(searchString, position) : -1;
    };
  }
  if (!proto.includes) {
    proto.includes = function (searchString: string, position?: number) {
      return this.baseVal ? this.baseVal.includes(searchString, position) : false;
    };
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
