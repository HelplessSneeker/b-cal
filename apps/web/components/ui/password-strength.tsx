'use client';

import { CheckIcon, CircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const CHECKS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  {
    label: 'Contains a symbol',
    test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(p),
  },
] as const;

function getScore(password: string): number {
  let score = CHECKS.filter((c) => c.test(password)).length;
  if (password.length >= 12) score++;
  return score;
}

const LEVELS = [
  { label: 'Weak', color: 'bg-red-500', segments: 1 },
  { label: 'Fair', color: 'bg-orange-500', segments: 2 },
  { label: 'Good', color: 'bg-blue-500', segments: 4 },
  { label: 'Strong', color: 'bg-green-500', segments: 5 },
] as const;

const TOTAL_SEGMENTS = 5;

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const score = getScore(password);
  const level = score === 0 ? null : LEVELS[score - 1];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                level && i < level.segments ? level.color : 'bg-muted',
              )}
            />
          ))}
        </div>
        {level && (
          <span
            className={cn(
              'text-xs font-medium',
              score === 1 && 'text-red-500',
              score === 2 && 'text-orange-500',
              score === 3 && 'text-blue-500',
              score === 4 && 'text-green-500',
            )}
          >
            {level.label}
          </span>
        )}
      </div>
      <ul className="space-y-1">
        {CHECKS.map((check) => {
          const passed = check.test(password);
          return (
            <li key={check.label} className="flex items-center gap-2 text-xs">
              {passed ? (
                <CheckIcon className="size-3.5 text-green-500" />
              ) : (
                <CircleIcon className="text-muted-foreground size-3.5" />
              )}
              <span
                className={cn(
                  passed ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {check.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
