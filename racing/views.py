from django.http import JsonResponse
from .models import Driver

def drivers_list(request):
    drivers = list(Driver.objects.values("id", "name", "team", "points"))
    return JsonResponse({"results": drivers})
