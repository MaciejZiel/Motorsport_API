from django.urls import path
from . import views

urlpatterns = [
    path("drivers/", views.drivers_list, name="drivers-list"),
]
