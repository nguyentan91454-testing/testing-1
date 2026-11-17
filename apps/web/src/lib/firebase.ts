import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export function firebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function authClient() {
  if (!firebaseConfigured()) throw new Error("Firebase Authentication chưa được cấu hình.");
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export async function signInWithFirebaseGoogle(): Promise<string> {
  const auth = authClient();
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  try {
    return await result.user.getIdToken(true);
  } finally {
    await signOut(auth);
  }
}

export function firebaseErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Bạn đã hủy đăng nhập Google.";
  if (code === "auth/popup-blocked") return "Trình duyệt đã chặn cửa sổ Google. Hãy cho phép popup rồi thử lại.";
  if (code === "auth/unauthorized-domain") return "Tên miền hiện tại chưa được cho phép trong Firebase Authentication.";
  if (code === "auth/operation-not-allowed") return "Đăng nhập Google chưa được bật trong Firebase Authentication.";
  if (error instanceof Error && error.message) return error.message;
  return "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
}
