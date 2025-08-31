import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('正しいメールアドレスを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .min(8, 'パスワードは8文字以上で入力してください'),
})

export const signupSchema = z.object({
  username: z
    .string()
    .min(1, 'ユーザー名を入力してください')
    .min(2, 'ユーザー名は2文字以上で入力してください')
    .max(50, 'ユーザー名は50文字以内で入力してください'),
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('正しいメールアドレスを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'パスワードは英字と数字を含む必要があります'),
  passwordConfirm: z.string().min(1, 'パスワード確認を入力してください'),
  birthDate: z
    .string()
    .min(1, '生年月日を選択してください')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 13 && age <= 120
    }, '13歳以上でないと登録できません'),
  gender: z
    .enum(['male', 'female', 'other', 'prefer-not-to-say'])
    .optional()
    .nullable(),
  agreeTerms: z
    .boolean()
    .refine((val) => val === true, '利用規約に同意する必要があります'),
  agreeMarketing: z.boolean().optional().default(false),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'パスワードが一致しません',
  path: ['passwordConfirm'],
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('正しいメールアドレスを入力してください'),
})

export type LoginForm = z.infer<typeof loginSchema>
export type SignupForm = z.infer<typeof signupSchema>
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>