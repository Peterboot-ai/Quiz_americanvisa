# Automated Email Reports

## Overview

The system now sends automated email reports about lead generation to the Unlocked team.

## Recipients

All reports are sent to:
- ana.modolo@unlockedtravel.com.br
- gilmara.langner@unlockedtravel.com.br
- rebeca@unlockedtravel.com.br
- sac@unlockedtravel.com.br
- contas.receber@unlockedtravel.com.br

## Daily Report

**When:** Every day at 8:00 AM (Brasília time)

**Content:**
- Number of new leads from the previous day
- Special alert if no leads were received (with warning message)

**Subject lines:**
- Normal: "📊 X novos leads ontem - Relatório Diário"
- Alert: "⚠️ Alerta: Nenhum lead ontem - Relatório Diário"

## Weekly Report

**When:** Every Monday at 8:00 AM (Brasília time)

**Content:**
- Total leads from the last 7 days
- Bar chart showing daily breakdown
- Day-by-day comparison

**Subject line:** "📈 Relatório Semanal - X leads nos últimos 7 dias"

## Technical Details

### Schedule Configuration

The cron schedule needs to be configured to run at:
- **11:00 UTC** (which is 8:00 AM Brasília time, accounting for UTC-3)

### Files

- `src/worker/scheduled.ts` - Contains all report generation logic
- `src/worker/index.ts` - Exports the scheduled handler

### Cron Trigger Setup

⚠️ **IMPORTANT:** The Mocha platform needs to configure a cron trigger for this worker.

The trigger should run: **`0 11 * * *`** (daily at 11:00 UTC = 8:00 AM Brazil)

This will automatically:
1. Send the daily report every day at 8 AM
2. Send the weekly report on Mondays at 8 AM

### Testing

To manually test the scheduled task during development, you can call the scheduled handler directly, but this requires local Wrangler setup which may not be available in the Mocha environment.

## Email Template Features

### Daily Report
- Clean, professional design with Unlocked branding
- Large number display showing lead count
- Red alert box when count is zero
- Gradient header matching brand colors

### Weekly Report
- Visual bar chart showing 7-day trend
- Total summary at the top
- Day labels with dates
- Professional layout optimized for email clients

## Notes

- Reports use the same Brevo email service as the quiz results
- Sender is "Unlocked Reports <contato@unlockedtravel.com.br>"
- All date/time calculations use Brazil timezone (America/Sao_Paulo)
- Charts are built with inline HTML/CSS for maximum email client compatibility
