/**
 * Supertest doesn't behave like a browser cookie jar — cookies from one
 * response aren't automatically sent on the next request. Tests that need
 * to simulate a logged-in session extract the Set-Cookie value here and
 * pass it explicitly via `.set("Cookie", ...)`.
 */
export const extractCookie = (res, name) => {
    const raw = res.headers["set-cookie"]?.find((c) => c.startsWith(`${name}=`));
    return raw ? raw.split(";")[0] : null;
};
