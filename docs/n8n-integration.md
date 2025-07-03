# N8n Integration Guide for ENGIE

This guide explains how to integrate ENGIE with n8n to automatically create GitHub issues from tasks.

## Overview

ENGIE can send tasks to an n8n webhook, which then creates GitHub issues. This allows you to:
- Automatically sync tasks to GitHub issues
- Add custom labels based on task properties
- Track task progress in GitHub
- Integrate with other services through n8n

## Setup Instructions

### 1. Configure n8n Workflow

1. Import the workflow from `docs/n8n-github-workflow.json` into your n8n instance
2. Configure the GitHub credentials in the GitHub node
3. Activate the workflow
4. Copy the webhook URL (it will look like: `https://your-n8n-instance.com/webhook/github-issue-creator`)

### 2. Configure ENGIE

Add the following environment variables to your `.env` file:

```env
# N8n Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/github-issue-creator
N8N_API_KEY=your-n8n-api-key  # Optional, if your n8n requires authentication

# GitHub Repository (default for issues)
GITHUB_REPOSITORY=owner/repo
```

### 3. Using the Integration

Once configured, ENGIE will automatically initialize the n8n integration on startup if the webhook URL is provided.

#### Send a Single Task to GitHub

```javascript
// In the ENGIE console or through IPC
await window.electronAPI.sendTaskToGitHub(taskId, {
  repository: 'owner/repo',  // Optional, uses GITHUB_REPOSITORY env var by default
  labels: ['enhancement', 'frontend'],  // Optional additional labels
  assignees: ['username'],  // Optional GitHub usernames
  milestone: 'v1.0.0'  // Optional milestone
});
```

#### Send All Pending Tasks to GitHub

```javascript
// Send all pending/in-progress tasks to GitHub
const result = await window.electronAPI.sendAllTasksToGitHub({
  repository: 'owner/repo',
  labels: ['from-engie']
});

console.log(`Sent ${result.sent} tasks, failed ${result.failed}`);
```

## Task to Issue Mapping

Tasks are converted to GitHub issues with the following mapping:

| Task Field | GitHub Issue Field |
|------------|-------------------|
| title | Issue Title |
| description | Issue Body (main description) |
| details | Implementation Details section |
| testStrategy | Test Strategy section |
| priority | Label: `priority:high/medium/low` |
| status | Label: `status:pending/in-progress/etc` |
| complexity | Label: `type:epic/feature/task/subtask` |
| tags | Additional labels |

## Advanced Configuration

### Custom Labels Based on Task Properties

The integration automatically adds labels based on:
- **Priority**: `priority:high`, `priority:medium`, `priority:low`
- **Status**: `status:pending`, `status:in-progress`, etc.
- **Complexity**: 
  - `type:epic` (complexity >= 8)
  - `type:feature` (complexity >= 5)
  - `type:task` (complexity >= 3)
  - `type:subtask` (complexity < 3)
- **Custom tags**: Any tags on the task are added as labels

### Error Handling

The integration includes:
- Automatic retry (3 attempts by default)
- Exponential backoff between retries
- Error events for monitoring
- Graceful degradation if n8n is unavailable

### Monitoring Integration Status

```javascript
// Check if n8n is available
const isAvailable = await window.electronAPI.isN8nAvailable();

// The integration emits events you can monitor:
// - 'connected': When n8n webhook is reachable
// - 'task-sent': When a task is successfully sent
// - 'task-send-error': When sending fails
```

## Troubleshooting

1. **Webhook not reachable**: Check your n8n instance is running and the webhook is active
2. **Authentication errors**: Verify your N8N_API_KEY if required
3. **GitHub errors**: Check the GitHub credentials in your n8n workflow
4. **Missing issues**: Check n8n execution logs for errors

## Security Considerations

- Store API keys securely using ENGIE's keychain integration
- Use HTTPS for webhook URLs
- Limit n8n webhook access with authentication if possible
- Review the workflow permissions in n8n