import { z } from "zod";

export const user = z.object({
    fullName: z.string()
        .trim()
        .min(3, { message: "name must be at least 3 characters long" })
        .max(20, { message: "name ust be no longer than 20 word" }),

    Email: z.email(),

    Password: z.string()
        .min(5, { message: "password must be at least 5 characters long" })
        .max(20, { message: "password must be at least 20 characters long" }),
})

export const Loginuser = z.object({
    Email: z.email(),

    Password: z.string()
        .min(5, { message: "password must be at least 5 characters long" })
        .max(20, { message: "password must be at least 20 characters long" }),
})

export const shareSchema = z.object({
    shareName : z.string(),
    price : z.number(),
    symbol : z.string(),
    sector : z.string(),
    image : z.string()
})