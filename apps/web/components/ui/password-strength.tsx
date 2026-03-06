'use client';

import { useTranslations } from 'next-intl';
import { CheckIcon, CircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const CHECKS = [
  { key: 'minLength', test: (p: string) => p.length >= 8 },
  { key: 'hasNumber', test: (p: string) => /\d/.test(p) },
  {
    key: 'hasSymbol',
    test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(p),
  },
] as const;

function getScore(password: string): number {
  let score = CHECKS.filter((c) => c.test(password)).length;
  if (password.length >= 12) score++;
  return score;
}

const LEVEL_KEYS = ['weak', 'fair', 'good', 'strong'] as const;

const LEVEL_META = [
  { color: 'bg-red-500', segments: 1, textColor: 'text-red-500' },
  { color: 'bg-orange-500', segments: 2, textColor: 'text-orange-500' },
  { color: 'bg-blue-500', segments: 4, textColor: 'text-blue-500' },
  { color: 'bg-green-500', segments: 5, textColor: 'text-green-500' },
] as const;

const TOTAL_SEGMENTS = 5;

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const tChecks = useTranslations('auth.passwordStrength.checks');
  const tLevels = useTranslations('auth.passwordStrength.levels');

  if (!password) return null;

  const score = getScore(password);
  const levelIndex = score === 0 ? null : score - 1;
  const level = levelIndex !== null ? LEVEL_META[levelIndex] : null;
  const levelKey = levelIndex !== null ? LEVEL_KEYS[levelIndex] : null;

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
        {level && levelKey && (
          <span className={cn('text-xs font-medium', level.textColor)}>
            {tLevels(levelKey)}
          </span>
        )}
      </div>
      <ul className="space-y-1">
        {CHECKS.map((check) => {
          const passed = check.test(password);
          return (
            <li key={check.key} className="flex items-center gap-2 text-xs">
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
                {tChecks(check.key)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
