/**
 * Plan limits for feature gating
 */

export const PLAN_LIMITS = {
    free: {
        presentations: 3,
        storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
        storageMB: 5 * 1024,
        members: 5,
        processingPriority: "standard" as const,
        processingDays: "3-5",
    },
    pro: {
        presentations: 50,
        storageBytes: 200 * 1024 * 1024 * 1024, // 200 GB
        storageMB: 200 * 1024,
        members: Infinity,
        processingPriority: "priority" as const,
        processingDays: "1-2",
    },
    enterprise: {
        presentations: Infinity,
        storageBytes: Infinity,
        storageMB: Infinity,
        members: Infinity,
        processingPriority: "express" as const,
        processingDays: "same-day",
    },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string | null | undefined) {
    const normalizedPlan = (plan || "free").toLowerCase() as PlanType;
    return PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS.free;
}

export function canCreatePresentation(
    currentCount: number,
    plan: string | null | undefined
): { allowed: boolean; limit: number; remaining: number } {
    const limits = getPlanLimits(plan);
    const limit = limits.presentations;
    const allowed = limit === Infinity || currentCount < limit;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - currentCount);

    return { allowed, limit, remaining };
}

export function canAddMember(
    currentCount: number,
    plan: string | null | undefined
): { allowed: boolean; limit: number; remaining: number } {
    const limits = getPlanLimits(plan);
    const limit = limits.members;
    const allowed = limit === Infinity || currentCount < limit;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - currentCount);

    return { allowed, limit, remaining };
}

export function canUploadFile(
    currentStorageBytes: number,
    fileSizeBytes: number,
    plan: string | null | undefined
): { allowed: boolean; limitBytes: number; usedBytes: number; remainingBytes: number } {
    const limits = getPlanLimits(plan);
    const limitBytes = limits.storageBytes;
    const usedBytes = currentStorageBytes;
    const remainingBytes = limitBytes === Infinity ? Infinity : Math.max(0, limitBytes - usedBytes);
    const allowed = limitBytes === Infinity || (usedBytes + fileSizeBytes) <= limitBytes;

    return { allowed, limitBytes, usedBytes, remainingBytes };
}
