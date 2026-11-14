# Дизайн-система MARS::404 (`src/ui`, власник — F7)

Єдине джерело вигляду для всіх панелей. Імпорт — лише з `src/ui`:

```tsx
import { Panel, StatusNote, EvidenceBadge, ItemRow, Disclosure, DataTable, EvaSign, Gauge, formatMinutes } from '../../ui';
```

Пропи компонентів **лише додаються** — наявні виклики не ламаються. Новий спільний блок — PR у `src/ui` з тестом.

## Принципи

1. **Колір лише доповнює.** Стан передається формою, іконкою і словом (SPEC §7.7). Ніякого «зелене = добре» без тексту.
2. **Невідоме ≠ безпечно.** `null` / `NaN` → «—» або «no data» (`formatMinutes`, `formatAmount`, `Gauge`). Найкращий статус — «within model», ніколи «safe».
3. **Чесність даних.** Кожне число з моделі показує статус джерела — `EvidenceBadge` (`verified` / `assumption` / `MOCK` / `pending`).
4. **Доступність.** Цілі дотику ≥ 40 px (`--touch`; у Glove mode — 64 px), фокус — рамка 3 px (`--focus`), без горизонтального скролу на 400 px, `prefers-reduced-motion` вимикає переходи.
5. **Інтерфейс англійською**, коментарі й документи — українською.

## Токени (`tokens.css`)

| Група | Токени |
|---|---|
| Поверхні | `--bg`, `--surface`, `--surface-2`, `--line` |
| Текст | `--text`, `--text-muted` |
| Акцент і стани | `--accent`, `--ok`, `--warn`, `--danger`, `--info`, `--focus`, `--deficit-bg` |
| Відступи | `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 px; `--gap` 12 px |
| Розміри | `--radius` 10 px, `--touch` 40 px |
| Шрифт | `--font`; шкала `--fs-hero` · `--fs-title` · `--fs-body` · `--fs-small` |

Нові кольори — лише як токени тут; у компонентах жодних «сирих» hex.

## Компоненти

| Компонент | Для чого | Головне |
|---|---|---|
| `Panel` | Секція з заголовком, власником і `MOCK` | `title`, `featureId`, `owner`, `mock` |
| `StatusNote` | Статус / ризик | `level`: `info` ℹ · `ok` ✔ · `warn` ⚠ · `danger` ✖ · `pending` ⏳ · `deficit` ⛔; `live="status"` або `"alert"` (лише дефіцит) |
| `EvidenceBadge` | Статус джерела числа | `status`: `verified` / `assumption` / `mock` / `pending` |
| `ItemRow` | Рядок списку (цілі, мітки, пункти чекліста) | `sign` · `title` · `meta` · `actions`; у `<ul className="ui-list">`; на ≤ 520 px дії переходять під назву |
| `Disclosure` | Згорнуті деталі | нативний `<details>`; `summary`, `defaultOpen` |
| `DataTable` | Таблиця чисел | `caption`, `columns` (`align: 'end'` для чисел), `rows`; прокрутка лише всередині |
| `Gauge` | Шкала ресурсу | `reserve` — риска резерву; `deficit` — від F5 (`reach.deficits`), сам не рахує |
| `EvaSign`, `EvaSignShape`, `EvaLegend` | EVA-символіка §7.11 | форма = тип, заливка / контур / пунктир = стан; однакові в HUD, на карті й у списках |
| `formatMinutes`, `formatAmount` | Числа для людей | `null` / `NaN` → «—» |

Кнопки — звичайний `<button>`; варіанти класами `ui-btn--primary` (головна дія панелі, одна на панель) і `ui-btn--ghost`.

## Як зробити список

```tsx
<ul className="ui-list">
  {targets.map((t) => (
    <ItemRow
      key={t.id}
      sign={<EvaSign kind="target" state={selected ? 'selected' : 'unselected'} label="" />}
      title={<button type="button" className="ui-btn--ghost">{t.name}</button>}
      meta={<EvidenceBadge status={t.status} />}
      actions={<button type="button">{selected ? 'Remove' : 'Add'} {t.name}</button>}
    />
  ))}
</ul>
```

## Як показати числа моделі з джерелами

Коротко — `StatusNote`, деталі — `Disclosure` з `DataTable`: назва людською мовою, значення з одиницями, `EvidenceBadge`, джерело посиланням.
