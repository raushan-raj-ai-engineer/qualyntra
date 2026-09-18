{{/*
File: deploy/helm/qualyntra/templates/_helpers.tpl
Purpose: Provides stable names and shared labels for Qualyntra Helm resources.
Author: Raushan Raj
*/}}
{{- define "qualyntra.name" -}}qualyntra{{- end -}}
{{- define "qualyntra.labels" -}}
app.kubernetes.io/name: {{ include "qualyntra.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
{{- define "qualyntra.serviceAccountName" -}}
{{- if .Values.global.serviceAccountName }}{{ .Values.global.serviceAccountName }}{{ else }}{{ .Release.Name }}-qualyntra{{ end -}}
{{- end -}}
