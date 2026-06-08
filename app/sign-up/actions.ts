"use server";

import { createUserWithWorkspace, type SignupResult } from "@/lib/signup";

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const workspaceName = String(formData.get("workspaceName") ?? "");

  return createUserWithWorkspace({
    name,
    email,
    password,
    workspaceName: workspaceName || undefined,
  });
}
