/* Direct links to /resume/… no longer hand out the PDF — they open the résumé form instead. */
export function onRequest({ request }) {
  return Response.redirect(new URL('/?resume=1', request.url).toString(), 302);
}
