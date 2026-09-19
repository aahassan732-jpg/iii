import os
import time
from threading import Lock
from typing import Any

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)
_session = requests.Session()
_session_id = os.getenv("INSTAGRAM_SESSIONID", "").strip()
_user_agent = os.getenv("INSTAGRAM_USER_AGENT", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36").strip()
_session.headers.update({"User-Agent": _user_agent, "Accept": "*/*", "X-IG-App-ID": "936619743392459"})
if _session_id:
    _session.cookies.set("sessionid", _session_id, domain=".instagram.com")

_request_timeout = max(float(os.getenv("INSTAGRAM_REQUEST_TIMEOUT_SECONDS", "12")), 3.0)
_lock = Lock()
_last_request_at = 0.0
_min_interval = max(float(os.getenv("MIN_REQUEST_INTERVAL_SECONDS", "8")), 1.0)
_cache_ttl = max(int(os.getenv("PROFILE_CACHE_SECONDS", "300")), 30)
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _profile_payload(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "username": user.get("username"),
        "userId": str(user.get("pk") or user.get("id")) if user.get("pk") or user.get("id") else None,
        "displayName": user.get("full_name") or None,
        "biography": user.get("biography") or None,
        "followers": (user.get("edge_followed_by") or {}).get("count", user.get("follower_count")),
        "following": (user.get("edge_follow") or {}).get("count", user.get("following_count")),
        "postCount": (user.get("edge_owner_to_timeline_media") or {}).get("count", user.get("media_count")),
        "verified": bool(user.get("is_verified")),
        "isPrivate": bool(user.get("is_private")),
        "profilePictureUrl": user.get("profile_pic_url_hd") or user.get("profile_pic_url") or None,
        "externalUrl": user.get("external_url") or None,
    }


@app.get("/health")
def health():
    return jsonify({"status": "ready", "provider": "instagram-http", "sessionConfigured": bool(_session_id)})


@app.post("/profile")
def profile():
    body = request.get_json(silent=True) or {}
    username = str(body.get("username", "")).strip().lstrip("@").lower()
    if not username or len(username) > 30 or any(ch not in "abcdefghijklmnopqrstuvwxyz0123456789._" for ch in username):
        return jsonify({"error": "اسم المستخدم غير صالح"}), 400

    now = time.time()
    cached = _cache.get(username)
    if cached and now - cached[0] < _cache_ttl:
        return jsonify({"profile": cached[1], "cached": True})

    global _last_request_at
    with _lock:
        wait = _min_interval - (time.time() - _last_request_at)
        if wait > 0:
            return jsonify({"error": "مصدر Instagram يفرض مهلة بين الطلبات. حاول بعد قليل.", "retryAfterSeconds": round(wait)}), 429
        _last_request_at = time.time()
        try:
            response = _session.get(
                "https://www.instagram.com/api/v1/users/web_profile_info/",
                params={"username": username},
                timeout=_request_timeout,
            )
            if response.status_code == 429:
                return jsonify({"error": "مصدر Instagram فرض حدًا مؤقتًا على الطلبات. حاول لاحقًا.", "retryAfterSeconds": 60}), 429
            if response.status_code == 404:
                return jsonify({"error": "الحساب غير موجود"}), 404
            response.raise_for_status()
            payload = response.json()
            user = ((payload.get("data") or {}).get("user") or {})
            if not user:
                return jsonify({"error": "لم يعثر المصدر على بيانات الحساب"}), 404
            result = _profile_payload(user)
            _cache[username] = (time.time(), result)
            return jsonify({"profile": result, "cached": False})
        except requests.Timeout:
            return jsonify({"error": "انتهت مهلة الاتصال بمصدر Instagram. حاول لاحقًا."}), 504
        except requests.RequestException:
            return jsonify({"error": "تعذر الاتصال بمصدر Instagram حاليًا"}), 502
        except ValueError:
            return jsonify({"error": "أعاد المصدر استجابة غير متوقعة"}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "10000")))
