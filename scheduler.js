"use strict";
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports)
        module.exports = api;
    root.LaundryScheduler = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
    function minutesFromTime(time) {
        var _a = String(time).split(":").map(Number), hours = _a[0], minutes = _a[1];
        return hours * 60 + minutes;
    }
    function applyMinutes(date, minutes) {
        var next = new Date(date);
        next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        return next;
    }
    function isWeekend(date) {
        return date.getDay() === 0 || date.getDay() === 6;
    }
    function startOfWorkday(date, settings) {
        return applyMinutes(date, minutesFromTime(settings.openHour));
    }
    function endOfWorkday(date, settings) {
        return applyMinutes(date, minutesFromTime(settings.closeHour));
    }
    function nextBusinessStart(date, settings) {
        var next = new Date(date);
        next.setDate(next.getDate() + 1);
        while (isWeekend(next))
            next.setDate(next.getDate() + 1);
        return startOfWorkday(next, settings);
    }
    function normalizeBusinessStart(date, settings) {
        var cursor = new Date(date);
        if (isWeekend(cursor) || cursor >= endOfWorkday(cursor, settings))
            return nextBusinessStart(cursor, settings);
        var start = startOfWorkday(cursor, settings);
        return cursor < start ? start : cursor;
    }
    function addWorkingMinutes(start, minutes, settings) {
        var cursor = normalizeBusinessStart(start, settings);
        var remaining = Number(minutes);
        while (remaining > 0) {
            var end = endOfWorkday(cursor, settings);
            var available = Math.max(0, Math.floor((end - cursor) / 60000));
            if (available >= remaining)
                return new Date(cursor.getTime() + remaining * 60000);
            remaining -= available;
            cursor = nextBusinessStart(cursor, settings);
        }
        return cursor;
    }
    function machineNames(type, count) {
        var prefix = type === "Lavado" ? "Lavarropas chico" : "Secadora";
        var names = [];
        for (var index = 0; index < Number(count || 1); index += 1) {
            names.push("".concat(prefix, " ").concat(index + 1));
        }
        return names;
    }
    function buildResources(settings, existingOrders) {
        var resources = {
            Lavado: machineNames("Lavado", settings.smallWashers),
            Secado: machineNames("Secado", settings.dryers),
        };
        var availability = {};
        Object.keys(resources).reduce(function (list, key) { return list.concat(resources[key]); }, []).forEach(function (name) {
            availability[name] = new Date(0);
        });
        existingOrders
            .reduce(function (list, order) { return list.concat(order.cycles || []); }, [])
            .sort(function (a, b) { return new Date(a.end) - new Date(b.end); })
            .forEach(function (cycle) {
            if (availability[cycle.machine] !== undefined)
                availability[cycle.machine] = new Date(cycle.end);
        });
        return { resources: resources, availability: availability };
    }
    function serviceCycles(service, settings) {
        var cycles = [];
        if (service && service.wash)
            cycles.push({ type: "Lavado", minutes: Number(settings.washingMinutes) });
        if (service && service.dry)
            cycles.push({ type: "Secado", minutes: Number(settings.dryingMinutes) });
        if (!cycles.length)
            cycles.push({ type: "Preparación", minutes: 30 });
        return cycles;
    }
    function scheduleOrder(existingOrders, service, settings, createdAt) {
        var _a = buildResources(settings, existingOrders), resources = _a.resources, availability = _a.availability;
        var cursor = normalizeBusinessStart(new Date(createdAt), settings);
        var cycles = [];
        var _loop_1 = function (requested) {
            if (requested.type === "Preparación") {
                var start = cursor;
                var end = addWorkingMinutes(start, requested.minutes, settings);
                cycles.push({ type: requested.type, machine: "Mesa de preparación", start: start.toISOString(), end: end.toISOString(), minutes: requested.minutes });
                cursor = end;
                return "continue";
            }
            var candidates = resources[requested.type].map(function (machine) {
                var start = normalizeBusinessStart(new Date(Math.max(cursor.getTime(), availability[machine].getTime())), settings);
                var end = addWorkingMinutes(start, requested.minutes, settings);
                return { machine: machine, start: start, end: end };
            }).sort(function (a, b) { return a.end - b.end || a.start - b.start; });
            var selected = candidates[0];
            availability[selected.machine] = selected.end;
            cycles.push({ type: requested.type, machine: selected.machine, start: selected.start.toISOString(), end: selected.end.toISOString(), minutes: requested.minutes });
            cursor = selected.end;
        };
        for (var _i = 0, _b = serviceCycles(service, settings); _i < _b.length; _i++) {
            var requested = _b[_i];
            _loop_1(requested);
        }
        return { estimate: cursor.toISOString(), cycles: cycles };
    }
    return {
        addWorkingMinutes: addWorkingMinutes,
        machineNames: machineNames,
        normalizeBusinessStart: normalizeBusinessStart,
        scheduleOrder: scheduleOrder,
    };
});
