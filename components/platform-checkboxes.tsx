"use client";

import { PLATFORM_LABELS } from "@/lib/providers";
import type { NumberOrigin, NumberPlatform } from "@/generated/prisma/enums";

/**
 * Checkboxes de vínculo — um número pode estar em mais de uma plataforma ao
 * mesmo tempo (ex: chip no WhatsApp Business *e* vinculado ao Z-API). Fica
 * fixo em Meta Cloud API só pra origem Meta oficial — as demais origens
 * (chip físico, número virtual, Iungo) têm as mesmas opções livres. Mesma
 * regra de lib/providers.ts (resolvePlatforms).
 */
export function PlatformCheckboxes({
  origin,
  selected,
  onChange,
}: {
  origin: NumberOrigin;
  selected: NumberPlatform[];
  onChange: (platforms: NumberPlatform[]) => void;
}) {
  if (origin === "META_OFICIAL") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="type-form-label text-ink-2">Vínculo</span>
        <p className="type-body-sm text-ink-3">Meta Cloud API (automático pra origem Meta oficial)</p>
        <input type="hidden" name="platforms" value="META_CLOUD" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="type-form-label text-ink-2">Vínculo</span>
      <div className="flex flex-col gap-2 rounded-[14px] bg-canvas p-3.5">
        {Object.entries(PLATFORM_LABELS).map(([value, label]) => {
          const platform = value as NumberPlatform;
          const checked = selected.includes(platform);
          return (
            <label key={value} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="platforms"
                value={value}
                checked={checked}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, platform]
                      : selected.filter((p) => p !== platform),
                  )
                }
                className="accent-accent"
              />
              {label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
