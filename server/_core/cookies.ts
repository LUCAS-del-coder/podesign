import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const isSecure = isSecureRequest(req);
  
  // 在生產環境（Railway）中，通常需要 secure cookie
  // Railway 會透過 proxy 轉發，所以需要檢查 x-forwarded-proto
  const shouldSetDomain =
    hostname &&
    !LOCAL_HOSTS.has(hostname) &&
    !isIpAddress(hostname) &&
    hostname !== "127.0.0.1" &&
    hostname !== "::1";

  // 對於 Railway，不設定 domain 讓 cookie 在整個網域下可用
  // 如果需要跨子網域，可以設定 domain
  const domain = undefined; // Railway 通常不需要設定 domain

  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "none" : "lax", // 生產環境用 none，開發環境用 lax
    secure: isSecure, // Railway 上應該是 true
    ...(domain && { domain }),
  };
}
