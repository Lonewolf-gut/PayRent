import { NextRequest } from "next/server";
import { registerSchema, firstZodIssueMessage } from "@/lib/validations/auth";
import { authService } from "@/lib/services/auth.service";
import { apiResponse, apiError, withPublicHandler } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";

export const POST = withPublicHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      new AppError(
        firstZodIssueMessage(
          parsed.error,
          "Please review your registration details and try again."
        ),
        400
      )
    );
  }

  const result = await authService.register(parsed.data);
  return apiResponse(result, 201);
});
