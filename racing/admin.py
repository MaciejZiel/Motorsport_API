from django.contrib import admin

from .models import Driver, Race, RaceResult, Season, Team


class RaceResultInline(admin.TabularInline):
    model = RaceResult
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "country")
    search_fields = ("name", "country")


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "team", "points")
    list_filter = ("team",)
    search_fields = ("name", "team__name")


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ("id", "year", "name")
    search_fields = ("year", "name")


@admin.register(Race)
class RaceAdmin(admin.ModelAdmin):
    list_display = ("id", "season", "round_number", "name", "country", "race_date")
    list_filter = ("season", "country")
    search_fields = ("name", "country")
    inlines = [RaceResultInline]


@admin.register(RaceResult)
class RaceResultAdmin(admin.ModelAdmin):
    list_display = ("id", "race", "position", "driver", "points_earned", "fastest_lap")
    list_filter = ("race__season", "race", "driver__team")
    search_fields = ("driver__name", "race__name")
