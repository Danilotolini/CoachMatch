#!/bin/sh
# Rollback das rotas já migradas: recria a rota manual apontando para a integração
# da Lambda Python. Deletar rota NÃO deleta a integração, então os ids abaixo
# continuam válidos enquanto as Lambdas Python existirem.
#
# Uso: veja as opções no bloco case abaixo.
set -e
PROFILE=${AWS_PROFILE:-CoachMatch}
API=qht6965nv9
REGION=sa-east-1

rota() { # rota <route-key> <integration-id> <authorizer-id>
  aws apigatewayv2 create-route --profile "$PROFILE" --api-id "$API" --region "$REGION" \
    --route-key "$1" --target "integrations/$2" \
    --authorization-type JWT --authorizer-id "$3"
}

case "$1" in
  specialties)
    rota 'GET /coach/specialties'   edeydfb bg0uj6
    rota 'GET /student/specialties' edeydfb ahu157
    ;;
  uploads)
    rota 'POST /coach/upload-url'   u731a60 bg0uj6
    rota 'POST /student/upload-url' u731a60 ahu157
    ;;
  schedule-reads)
    rota 'GET /coach/schedule'                  4pg5z47 bg0uj6
    rota 'GET /coach/schedule/requests'         wlpneze bg0uj6
    rota 'GET /student/coach/schedules'         8uz3esq ahu157
    rota 'GET /student/coach/schedules/request' pci4e92 ahu157
    rota 'GET /student/gyms/schedule'           cd7wshv ahu157
    ;;
  coach-create-schedule)
    rota 'POST /coach/schedule' t9czfz6 bg0uj6
    ;;
  student-create-schedule-request)
    rota 'POST /student/coach/schedules/request' 9myaz2m ahu157
    ;;
  coach-approve-schedule)
    rota 'POST /coach/schedule/approve' 63hq8xp bg0uj6
    ;;
  coach-cancel-schedule)
    rota 'POST /coach/schedule/cancel' iitgs1f bg0uj6
    ;;
  student-cancel-schedule)
    rota 'POST /student/coach/schedules/cancel' n46n9p4 ahu157
    ;;
  student-cancel-schedule-request)
    rota 'DELETE /student/coach/schedules/request' gzamjpo ahu157
    ;;
  coach-update-class-status)
    rota 'POST /coach/schedule/class/status' zc62o39 bg0uj6
    ;;
  *)
    echo "uso: $0 specialties | uploads | schedule-reads | coach-create-schedule | student-create-schedule-request | coach-approve-schedule | coach-cancel-schedule | student-cancel-schedule | student-cancel-schedule-request | coach-update-class-status" >&2
    exit 1
    ;;
esac
