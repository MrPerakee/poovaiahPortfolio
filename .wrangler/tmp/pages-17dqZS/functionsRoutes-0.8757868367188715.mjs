import { onRequestGet as __api_resume_js_onRequestGet } from "/home/claude/poovaiahportfolio/functions/api/resume.js"
import { onRequestPost as __api_resume_js_onRequestPost } from "/home/claude/poovaiahportfolio/functions/api/resume.js"
import { onRequest as __resume___path___js_onRequest } from "/home/claude/poovaiahportfolio/functions/resume/[[path]].js"

export const routes = [
    {
      routePath: "/api/resume",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_resume_js_onRequestGet],
    },
  {
      routePath: "/api/resume",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_resume_js_onRequestPost],
    },
  {
      routePath: "/resume/:path*",
      mountPath: "/resume",
      method: "",
      middlewares: [],
      modules: [__resume___path___js_onRequest],
    },
  ]