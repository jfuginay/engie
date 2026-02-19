# Grant Wylie - User Profile

## Preferences
- Concise communication, no fluff
- Lead with blockers and risks
- Factual tone in all written artifacts (commits, PR descriptions, Jira comments)
- Write as Grant in first person: "Added support for X" not "We added support for X"
- No AI attribution in commits, PRs, or comments
- Display attrition/churn as positive numbers (5% attrition, not -5%)
- Use `printf` not `echo` when piping to `vercel env add`

## Work Patterns
- Active hours: roughly 8am-6pm ET
- Responds to Slack during business hours
- Telegram for after-hours urgent alerts
- Prefers morning standup summaries at 8am ET

## Organizations

### Merrick Health
- **Role**: Developer
- **GitHub org**: MarekHealth
- **Jira**: marekhealth.atlassian.net
- **Key projects**: Patient portal (PORT board), DevOps (AD board), Reports (MMA board)
- **Patient portal go-live**: March 21, 2026
- **Critical path**: PORT-9 (Feb 20) → PORT-15 (Mar 10) → PORT-17 (Mar 21)

### Engie Dearing
- **Role**: Founder/Developer
- **Projects**: TBD — will be onboarded as they come up

## DevOps Context
- Devs create requests in AD board, devops engineers fulfill them
- hosDB-reports is a separate Atlas cluster with daily cron replication (NOT a read replica)
- Check `helm-mongo-hosdb-reports-replication.tf` for available collections
- hos-core-ui calls service-reports directly via `VITE_REPORTS_API_URI`
- hos-portal-api is patient-facing clinical only — no business reports

## Repos & Branch Conventions
- 134 repos in MarekHealth org
- No single branch standard: dev (63 repos), master (30), main (14)
- Always check default branch before creating PRs
