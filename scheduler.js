(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LaundryScheduler = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function minutesFromTime(time) {
    const [hours, minutes] = String(time).split(":").map(Number);
    return hours * 60 + minutes;
  }

  function applyMinutes(date, minutes) {
    const next = new Date(date);
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
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    while (isWeekend(next)) next.setDate(next.getDate() + 1);
    return startOfWorkday(next, settings);
  }

  function normalizeBusinessStart(date, settings) {
    let cursor = new Date(date);
    if (isWeekend(cursor) || cursor >= endOfWorkday(cursor, settings)) return nextBusinessStart(cursor, settings);
    const start = startOfWorkday(cursor, settings);
    return cursor < start ? start : cursor;
  }

  function addWorkingMinutes(start, minutes, settings) {
    let cursor = normalizeBusinessStart(start, settings);
    let remaining = Number(minutes);
    while (remaining > 0) {
      const end = endOfWorkday(cursor, settings);
      const available = Math.max(0, Math.floor((end - cursor) / 60000));
      if (available >= remaining) return new Date(cursor.getTime() + remaining * 60000);
      remaining -= available;
      cursor = nextBusinessStart(cursor, settings);
    }
    return cursor;
  }

  function machineNames(type, count) {
    const prefix = type === "Lavado" ? "Lavarropas chico" : "Secadora";
    return Array.from({ length: Number(count || 1) }, (_, index) => `${prefix} ${index + 1}`);
  }

  function buildResources(settings, existingOrders) {
    const resources = {
      Lavado: machineNames("Lavado", settings.smallWashers),
      Secado: machineNames("Secado", settings.dryers),
    };
    const availability = {};
    Object.values(resources).flat().forEach((name) => {
      availability[name] = new Date(0);
    });

    existingOrders
      .flatMap((order) => order.cycles || [])
      .sort((a, b) => new Date(a.end) - new Date(b.end))
      .forEach((cycle) => {
        if (availability[cycle.machine] !== undefined) availability[cycle.machine] = new Date(cycle.end);
      });

    return { resources, availability };
  }

  function serviceCycles(service, settings) {
    const cycles = [];
    if (service && service.wash) cycles.push({ type: "Lavado", minutes: Number(settings.washingMinutes) });
    if (service && service.dry) cycles.push({ type: "Secado", minutes: Number(settings.dryingMinutes) });
    if (!cycles.length) cycles.push({ type: "Preparación", minutes: 30 });
    return cycles;
  }

  function scheduleOrder(existingOrders, service, settings, createdAt) {
    const { resources, availability } = buildResources(settings, existingOrders);
    let cursor = normalizeBusinessStart(new Date(createdAt), settings);
    const cycles = [];

    for (const requested of serviceCycles(service, settings)) {
      if (requested.type === "Preparación") {
        const start = cursor;
        const end = addWorkingMinutes(start, requested.minutes, settings);
        cycles.push({ type: requested.type, machine: "Mesa de preparación", start: start.toISOString(), end: end.toISOString(), minutes: requested.minutes });
        cursor = end;
        continue;
      }

      const candidates = resources[requested.type].map((machine) => {
        const start = normalizeBusinessStart(new Date(Math.max(cursor.getTime(), availability[machine].getTime())), settings);
        const end = addWorkingMinutes(start, requested.minutes, settings);
        return { machine, start, end };
      }).sort((a, b) => a.end - b.end || a.start - b.start);

      const selected = candidates[0];
      availability[selected.machine] = selected.end;
      cycles.push({ type: requested.type, machine: selected.machine, start: selected.start.toISOString(), end: selected.end.toISOString(), minutes: requested.minutes });
      cursor = selected.end;
    }

    return { estimate: cursor.toISOString(), cycles };
  }

  return {
    addWorkingMinutes,
    machineNames,
    normalizeBusinessStart,
    scheduleOrder,
  };
});
