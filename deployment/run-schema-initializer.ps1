param(
  [Parameter(Mandatory=$true)][ValidateSet('staging','production')][string]$Environment,
  [Parameter(Mandatory=$true)][string]$Cluster,
  [Parameter(Mandatory=$true)][string]$TaskDefinition,
  [Parameter(Mandatory=$true)][string[]]$Subnets,
  [Parameter(Mandatory=$true)][string[]]$SecurityGroups,
  [Parameter(Mandatory=$true)][string]$Region,
  [switch]$AllowProduction
)
$ErrorActionPreference = 'Stop'
if ($Environment -eq 'production' -and -not $AllowProduction) { throw 'Production requires a reviewed release gate.' }
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { throw 'AWS CLI v2 is required.' }
if ($TaskDefinition -notmatch ':task-definition/.+:[0-9]+$') { throw 'Use an exact schema task-definition revision ARN.' }
$taskInput = @{
  cluster=$Cluster; taskDefinition=$TaskDefinition; launchType='FARGATE';
  networkConfiguration=@{ awsvpcConfiguration=@{ subnets=$Subnets; securityGroups=$SecurityGroups; assignPublicIp='DISABLED' } }
} | ConvertTo-Json -Depth 8 -Compress
$taskFile = Join-Path ([System.IO.Path]::GetTempPath()) ('wellisha-schema-' + [guid]::NewGuid().ToString() + '.json')
try {
  [System.IO.File]::WriteAllText($taskFile,$taskInput,[System.Text.UTF8Encoding]::new($false))
  $taskRaw = & aws ecs run-task --region $Region --cli-input-json ("file://" + $taskFile)
  if ($LASTEXITCODE -ne 0) { throw 'Schema task submission failed.' }
  $taskResult = $taskRaw | ConvertFrom-Json
  if ($taskResult.failures.Count -gt 0 -or $taskResult.tasks.Count -ne 1) { throw 'Exactly one schema task must start successfully.' }
  $taskArn = $taskResult.tasks[0].taskArn
  & aws ecs wait tasks-stopped --region $Region --cluster $Cluster --tasks $taskArn
  if ($LASTEXITCODE -ne 0) { throw 'Schema task timed out; deployment blocked.' }
  $taskDescriptionRaw = & aws ecs describe-tasks --region $Region --cluster $Cluster --tasks $taskArn
  if ($LASTEXITCODE -ne 0) { throw 'Unable to verify schema task completion.' }
  $taskDescription = $taskDescriptionRaw | ConvertFrom-Json
  $taskContainers = @($taskDescription.tasks[0].containers | Where-Object { $_.name -eq 'app' })
  if ($taskContainers.Count -ne 1 -or $null -eq $taskContainers[0].exitCode -or $taskContainers[0].exitCode -ne 0) {
    throw 'Schema initializer failed; inspect its restricted CloudWatch logs. Deployment blocked.'
  }
  Write-Output 'New application schema initialized successfully.'
} finally {
  if (Test-Path -LiteralPath $taskFile) { Remove-Item -LiteralPath $taskFile }
}

