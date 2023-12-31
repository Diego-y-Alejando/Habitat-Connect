import { run_all, is_function, noop, identity, tick, SvelteComponent, init, safe_not_equal, ensure_array_like, empty, insert, detach, destroy_each, component_subscribe, set_store_value, element, text, attr, append, listen, set_data, action_destroyer, transition_in, group_outros, check_outros, transition_out, space, create_component, mount_component, destroy_component, construct_svelte_component, set_style, get_current_component } from 'svelte/internal';
import { getContext, setContext, beforeUpdate } from 'svelte';
import { derived, get, writable, readable } from 'svelte/store';

function keyEnter(fn) {
    return function (e) {
        return e.key === 'Enter' || e.key === ' ' ? fn.call(this, e) : undefined;
    };
}

function setContent(node, content) {
    let actions = {
        update(content) {
            if (typeof content == 'string') {
                node.innerText = content;
            } else if (content?.domNodes) {
                node.replaceChildren(...content.domNodes);
            } else if (content?.html) {
                node.innerHTML = content.html;
            }
        }
    };
    actions.update(content);

    return actions;
}

/** Dispatch event occurred outside of node */
function outsideEvent(node, type) {

    const handlePointerDown = jsEvent => {
        if (node && !node.contains(jsEvent.target)) {
            node.dispatchEvent(
                new CustomEvent(type + 'outside', {detail: {jsEvent}})
            );
        }
    };

    document.addEventListener(type, handlePointerDown, true);

    return {
        destroy() {
            document.removeEventListener(type, handlePointerDown, true);
        }
    };
}

const DAY_IN_SECONDS = 86400;

function createDate(input = undefined) {
    if (input !== undefined) {
        return input instanceof Date ? _fromLocalDate(input) : _fromISOString(input);
    }

    return _fromLocalDate(new Date());
}

function createDuration(input) {
    if (typeof input === 'number') {
        input = {seconds: input};
    } else if (typeof input === 'string') {
        // Expected format hh[:mm[:ss]]
        let seconds = 0, exp = 2;
        for (let part of input.split(':', 3)) {
            seconds += parseInt(part, 10) * Math.pow(60, exp--);
        }
        input = {seconds};
    } else if (input instanceof Date) {
        input = {hours: input.getUTCHours(), minutes: input.getUTCMinutes(), seconds: input.getUTCSeconds()};
    }

    let weeks = input.weeks || input.week || 0;

    return {
        years: input.years || input.year || 0,
        months: input.months || input.month || 0,
        days: weeks * 7 + (input.days || input.day || 0),
        seconds: (input.hours || input.hour || 0) * 60 * 60 +
            (input.minutes || input.minute || 0) * 60 +
            (input.seconds || input.second || 0),
        inWeeks: !!weeks
    };
}

function cloneDate(date) {
    return new Date(date.getTime());
}

function addDuration(date, duration, x = 1) {
    date.setUTCFullYear(date.getUTCFullYear() + x * duration.years);
    let month = date.getUTCMonth() + x * duration.months;
    date.setUTCMonth(month);
    month %= 12;
    if (month < 0) {
        month += 12;
    }
    while (date.getUTCMonth() !== month) {
        subtractDay(date);
    }
    date.setUTCDate(date.getUTCDate() + x * duration.days);
    date.setUTCSeconds(date.getUTCSeconds() + x * duration.seconds);

    return date;
}

function subtractDuration(date, duration, x = 1) {
    return addDuration(date, duration, -x);
}

function addDay(date, x = 1) {
    date.setUTCDate(date.getUTCDate() + x);

    return date;
}

function subtractDay(date, x = 1) {
    return addDay(date, -x);
}

function setMidnight(date) {
    date.setUTCHours(0, 0, 0, 0);

    return date;
}

function toLocalDate(date) {
    return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds()
    );
}

function toISOString(date) {
    return date.toISOString().substring(0, 19);
}

function datesEqual(date1, ...dates2) {
    return dates2.every(date2 => date1.getTime() === date2.getTime());
}

function nextClosestDay(date, day) {
    let diff = day - date.getUTCDay();
    date.setUTCDate(date.getUTCDate() + (diff >= 0 ? diff : diff + 7));
    return date;
}

function prevClosestDay(date, day) {
    let diff = day - date.getUTCDay();
    date.setUTCDate(date.getUTCDate() + (diff <= 0 ? diff : diff - 7));
    return date;
}

/**
 * Check whether given date is string which contains no time part
  */
function noTimePart(date) {
    return typeof date === 'string' && date.length <= 10;
}

/**
 * Copy time from one date to another
 */
function copyTime(toDate, fromDate) {
    toDate.setUTCHours(fromDate.getUTCHours(), fromDate.getUTCMinutes(), fromDate.getUTCSeconds(), 0);

    return toDate;
}

/**
 * Private functions
 */

function _fromLocalDate(date) {
    return new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
    ));
}

function _fromISOString(str) {
    const parts = str.match(/\d+/g);
    return new Date(Date.UTC(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
        Number(parts[3] || 0),
        Number(parts[4] || 0),
        Number(parts[5] || 0)
    ));
}

function debounce(fn, handle, queueStore) {
    queueStore.update(queue => queue.set(handle, fn));
}

function flushDebounce(queue) {
    run_all(queue);
    queue.clear();
}

function assign(...args) {
    return Object.assign(...args);
}

function keys(object) {
    return Object.keys(object);
}

function floor(value) {
    return Math.floor(value);
}

function min(...args) {
    return Math.min(...args);
}

function max(...args) {
    return Math.max(...args);
}

function symbol() {
    return Symbol('ec');
}

function createElement(tag, className, content) {
    let el = document.createElement(tag);
    el.className = className;
    if (typeof content == 'string') {
        el.innerText = content;
    } else if (content.domNodes) {
        el.replaceChildren(...content.domNodes);
    } else if (content.html) {
        el.innerHTML = content.html;
    }
    return el;
}

function hasYScroll(el) {
    return el.scrollHeight > el.clientHeight;
}

function rect(el) {
    return el.getBoundingClientRect();
}

function ancestor(el, up) {
    while (up--) {
        el = el.parentElement;
    }
    return el;
}

function height(el) {
    return rect(el).height;
}

let payloadProp = symbol();
function setPayload(el, payload) {
    el[payloadProp] = payload;
}

function hasPayload(el) {
    return !!el?.[payloadProp];
}

function getPayload(el) {
    return el[payloadProp];
}

function getElementWithPayload(x, y, root = document) {
    for (let el of root.elementsFromPoint(x, y)) {
        if (hasPayload(el)) {
            return el;
        }
        /** @see https://github.com/vkurko/calendar/issues/142 */
        if (el.shadowRoot) {
            let shadowEl = getElementWithPayload(x, y, el.shadowRoot);
            if (shadowEl) {
                return shadowEl;
            }
        }
    }
    return null;
}

function createView(view, _viewTitle, _currentRange, _activeRange) {
    return {
        type: view,
        title: _viewTitle,
        currentStart: _currentRange.start,
        currentEnd: _currentRange.end,
        activeStart: _activeRange.start,
        activeEnd: _activeRange.end,
        calendar: undefined
    };
}

function toViewWithLocalDates(view) {
    view = assign({}, view);
    view.currentStart = toLocalDate(view.currentStart);
    view.currentEnd = toLocalDate(view.currentEnd);
    view.activeStart = toLocalDate(view.activeStart);
    view.activeEnd = toLocalDate(view.activeEnd);

    return view;
}

let eventId = 1;
function createEvents(input) {
    return input.map(event => ({
        id: 'id' in event ? String(event.id) : `{generated-${eventId++}}`,
        resourceIds: Array.isArray(event.resourceIds)
            ? event.resourceIds.map(String)
            : ('resourceId' in event ? [String(event.resourceId)] : []),
        allDay: event.allDay ?? (noTimePart(event.start) && noTimePart(event.end)),
        start: createDate(event.start),
        end: createDate(event.end),
        title: event.title || '',
        titleHTML: event.titleHTML || '',
        editable: event.editable,
        startEditable: event.startEditable,
        durationEditable: event.durationEditable,
        display: event.display || 'auto',
        extendedProps: event.extendedProps || {},
        backgroundColor: event.backgroundColor || event.color,
        textColor: event.textColor
    }));
}

function createEventSources(input) {
    return input.map(source => ({
        events: source.events,
        url: (source.url && source.url.trimEnd('&')) || '',
        method: (source.method && source.method.toUpperCase()) || 'GET',
        extraParams: source.extraParams || {}
    }));
}

function createEventChunk(event, start, end) {
    return {
        start: event.start > start ? event.start : start,
        end: event.end < end ? event.end : end,
        event
    };
}

function sortEventChunks(chunks) {
    // Sort by start date (all-day events always on top)
    chunks.sort((a, b) => a.start - b.start || b.event.allDay - a.event.allDay);
}

/**
 * Prepare event chunks for month view and all-day slot in week view
 */
function prepareEventChunks(chunks, hiddenDays) {
    let longChunks = {};

    if (chunks.length) {
        sortEventChunks(chunks);

        let prevChunk;
        for (let chunk of chunks) {
            let dates = [];
            let date = setMidnight(cloneDate(chunk.start));
            while (chunk.end > date) {
                if (!hiddenDays.includes(date.getUTCDay())) {
                    dates.push(cloneDate(date));
                    if (dates.length > 1) {
                        let key = date.getTime();
                        if (longChunks[key]) {
                            longChunks[key].chunks.push(chunk);
                        } else {
                            longChunks[key] = {
                                sorted: false,
                                chunks: [chunk]
                            };
                        }
                    }
                }
                addDay(date);
            }
            if (dates.length) {
                chunk.date = dates[0];
                chunk.days = dates.length;
                chunk.dates = dates;
                if (chunk.start < dates[0]) {
                    chunk.start = dates[0];
                }
                if (setMidnight(cloneDate(chunk.end)) > dates[dates.length - 1]) {
                    chunk.end = dates[dates.length - 1];
                }
            } else {
                chunk.date = setMidnight(cloneDate(chunk.start));
                chunk.days = 1;
                chunk.dates = [chunk.date];
            }

            if (prevChunk && datesEqual(prevChunk.date, chunk.date)) {
                chunk.prev = prevChunk;
            }
            prevChunk = chunk;
        }
    }

    return longChunks;
}

function repositionEvent(chunk, longChunks, height) {
    chunk.top = 0;
    if (chunk.prev) {
        chunk.top = chunk.prev.bottom + 1;
    }
    chunk.bottom = chunk.top + height;
    let margin = 1;
    let key = chunk.date.getTime();
    if (longChunks[key]?.sorted || longChunks[key]?.chunks.every(chunk => 'top' in chunk)) {
        if (!longChunks[key].sorted) {
            longChunks[key].chunks.sort((a, b) => a.top - b.top);
            longChunks[key].sorted = true;
        }
        for (let longChunk of longChunks[key].chunks) {
            if (chunk.top < longChunk.bottom && chunk.bottom > longChunk.top) {
                let offset = longChunk.bottom - chunk.top + 1;
                margin += offset;
                chunk.top += offset;
                chunk.bottom += offset;
            }
        }
    }

    return margin;
}

function createEventContent(chunk, displayEventEnd, eventContent, theme, _intlEventTime, _view) {
    let timeText = _intlEventTime.formatRange(
        chunk.start,
        displayEventEnd && chunk.event.display !== 'pointer'
            ? copyTime(cloneDate(chunk.start), chunk.end)  // make Intl.formatRange output only the time part
            : chunk.start
    );
    let content;

    if (eventContent) {
        content = is_function(eventContent)
            ? eventContent({
                event: toEventWithLocalDates(chunk.event),
                timeText,
                view: toViewWithLocalDates(_view)
            })
            : eventContent;
    } else {
        switch (chunk.event.display) {
            case 'background':
                content = '';
                break;
            case 'pointer':
                content = {
                    domNodes: [createElement('div', theme.eventTime, timeText)]
                };
                break;
            default:
                content = {
                    domNodes: [
                        ...chunk.event.allDay ? [] : [createElement('div', theme.eventTime, timeText)],
                        createElement('div', theme.eventTitle, chunk.event.title)
                    ]
                };
        }
    }

    return [timeText, content];
}

function createEventClasses(eventClassNames, event, _view) {
    if (eventClassNames) {
        if (is_function(eventClassNames)) {
            eventClassNames = eventClassNames({
                event: toEventWithLocalDates(event),
                view: toViewWithLocalDates(_view)
            });
        }
        return Array.isArray(eventClassNames) ? eventClassNames : [eventClassNames];
    }
    return [];
}

function toEventWithLocalDates(event) {
    return _cloneEvent(event, toLocalDate);
}

function cloneEvent(event) {
    return _cloneEvent(event, cloneDate);
}

function _cloneEvent(event, dateFn) {
    event = assign({}, event);
    event.start = dateFn(event.start);
    event.end = dateFn(event.end);

    return event;
}

/**
 * Check whether the event intersects with the given date range and resource
 * @param event
 * @param start
 * @param end
 * @param [resource]
 * @param [timeMode]  Zero-length events should be allowed (@see https://github.com/vkurko/calendar/issues/50), except in time mode
 * @return boolean
 */
function eventIntersects(event, start, end, resource, timeMode) {
    return (
        event.start < end && event.end > start || !timeMode && datesEqual(event.start, event.end, start)
    ) && (
        resource === undefined || event.resourceIds.includes(resource.id)
    );
}

function helperEvent(display) {
    return previewEvent(display) || ghostEvent(display) || pointerEvent(display);
}

function bgEvent(display) {
    return display === 'background';
}

function previewEvent(display) {
    return display === 'preview';
}

function ghostEvent(display) {
    return display === 'ghost';
}

function pointerEvent(display) {
    return display === 'pointer';
}

function btnTextDay(text) {
    return btnText(text, 'day');
}

function btnTextWeek(text) {
    return btnText(text, 'week');
}

function btnTextMonth(text) {
    return btnText(text, 'month');
}

function btnTextYear(text) {
    return btnText(text, 'year');
}

function btnText(text, period) {
    return {
        ...text,
        next: 'Next ' + period,
        prev: 'Previous ' + period
    };
}

function themeView(view) {
    return theme => ({...theme, view});
}

function intl(locale, format) {
    return derived([locale, format], ([$locale, $format]) => {
        let intl = is_function($format)
            ? {format: $format}
            : new Intl.DateTimeFormat($locale, $format);
        return {
            format: date => intl.format(toLocalDate(date))
        };
    });
}

function intlRange(locale, format) {
    return derived([locale, format], ([$locale, $format]) => {
        let intl = is_function($format)
            ? {formatRange: $format}
            : new Intl.DateTimeFormat($locale, $format);
        return {
            formatRange: (start, end) => intl.formatRange(toLocalDate(start), toLocalDate(end))
        };
    });
}

function createOptions(plugins) {
    let options = {
        allDayContent: undefined,
        allDaySlot: true,
        buttonText: {
            today: 'today',
        },
        date: new Date(),
        datesSet: undefined,
        dayHeaderFormat: {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric'
        },
        displayEventEnd: true,
        duration: {weeks: 1},
        events: [],
        eventBackgroundColor: undefined,
        eventTextColor: undefined,
        eventClassNames: undefined,
        eventClick: undefined,
        eventColor: undefined,
        eventContent: undefined,
        eventDidMount: undefined,
        eventMouseEnter: undefined,
        eventMouseLeave: undefined,
        eventSources: [],
        eventTimeFormat: {
            hour: 'numeric',
            minute: '2-digit'
        },
        firstDay: 0,
        flexibleSlotTimeLimits: false,  // ec option
        headerToolbar: {
            start: 'title',
            center: '',
            end: 'today prev,next'
        },
        height: undefined,
        hiddenDays: [],
        highlightedDates: [],  // ec option
        lazyFetching: true,
        loading: undefined,
        locale: undefined,
        nowIndicator: false,
        selectable: false,
        scrollTime: '06:00:00',
        slotDuration: '00:30:00',
        slotEventOverlap: true,
        slotHeight: 24,  // ec option
        slotLabelFormat: {
            hour: 'numeric',
            minute: '2-digit'
        },
        slotMaxTime: '24:00:00',
        slotMinTime: '00:00:00',
        theme: {
            allDay: 'ec-all-day',
            active: 'ec-active',
            bgEvent: 'ec-bg-event',
            bgEvents: 'ec-bg-events',
            body: 'ec-body',
            button: 'ec-button',
            buttonGroup: 'ec-button-group',
            calendar: 'ec',
            compact: 'ec-compact',
            content: 'ec-content',
            day: 'ec-day',
            dayHead: 'ec-day-head',
            days: 'ec-days',
            event: 'ec-event',
            eventBody: 'ec-event-body',
            eventTime: 'ec-event-time',
            eventTitle: 'ec-event-title',
            events: 'ec-events',
            extra: 'ec-extra',
            handle: 'ec-handle',
            header: 'ec-header',
            hiddenScroll: 'ec-hidden-scroll',
            highlight: 'ec-highlight',
            icon: 'ec-icon',
            line: 'ec-line',
            lines: 'ec-lines',
            nowIndicator: 'ec-now-indicator',
            otherMonth: 'ec-other-month',
            sidebar: 'ec-sidebar',
            sidebarTitle: 'ec-sidebar-title',
            today: 'ec-today',
            time: 'ec-time',
            title: 'ec-title',
            toolbar: 'ec-toolbar',
            view: '',
            weekdays: ['ec-sun', 'ec-mon', 'ec-tue', 'ec-wed', 'ec-thu', 'ec-fri', 'ec-sat'],
            withScroll: 'ec-with-scroll'
        },
        titleFormat: {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        },
        view: undefined,
        viewDidMount: undefined,
        views: {}
    };

    for (let plugin of plugins) {
        plugin.createOptions?.(options);
    }

    return options;
}

function createParsers(plugins) {
    let parsers = {
        date: date => setMidnight(createDate(date)),
        duration: createDuration,
        events: createEvents,
        eventSources: createEventSources,
        hiddenDays: days => [...new Set(days)],
        highlightedDates: dates => dates.map(createDate),
        scrollTime: createDuration,
        slotDuration: createDuration,
        slotMaxTime: createDuration,
        slotMinTime: createDuration
    };

    for (let plugin of plugins) {
        plugin.createParsers?.(parsers);
    }

    return parsers;
}

function diff(options, prevOptions) {
    let diff = [];
    for (let key of keys(options)) {
        if (options[key] !== prevOptions[key]) {
            diff.push([key, options[key]]);
        }
    }
    assign(prevOptions, options);

    return diff;
}

function dayGrid(state) {
    return derived(state.view, $view => $view?.startsWith('dayGrid'));
}

function activeRange(state) {
    return derived(
        [state._currentRange, state.firstDay, state.slotMaxTime, state._dayGrid],
        ([$_currentRange, $firstDay, $slotMaxTime, $_dayGrid]) => {
            let start = cloneDate($_currentRange.start);
            let end = cloneDate($_currentRange.end);

            if ($_dayGrid) {
                // First day of week
                prevClosestDay(start, $firstDay);
                nextClosestDay(end, $firstDay);
            } else if ($slotMaxTime.days || $slotMaxTime.seconds > DAY_IN_SECONDS) {
                addDuration(subtractDay(end), $slotMaxTime);
                let start2 = subtractDay(cloneDate(end));
                if (start2 < start) {
                    start = start2;
                }
            }

            return {start, end};
        }
    );
}

function currentRange(state) {
    return derived(
        [state.date, state.duration, state.firstDay, state._dayGrid],
        ([$date, $duration, $firstDay, $_dayGrid]) => {
            let start = cloneDate($date), end;
            if ($_dayGrid) {
                start.setUTCDate(1);
            } else if ($duration.inWeeks) {
                // First day of week
                prevClosestDay(start, $firstDay);
            }
            end = addDuration(cloneDate(start), $duration);

            return {start, end};
        }
    );
}

function viewDates(state) {
    return derived([state._activeRange, state.hiddenDays], ([$_activeRange, $hiddenDays]) => {
        let dates = [];
        let date = setMidnight(cloneDate($_activeRange.start));
        let end = setMidnight(cloneDate($_activeRange.end));
        while (date < end) {
            if (!$hiddenDays.includes(date.getUTCDay())) {
                dates.push(cloneDate(date));
            }
            addDay(date);
        }
        if (!dates.length && $hiddenDays.length && $hiddenDays.length < 7) {
            // Try to move the date
            state.date.update(date => {
                while ($hiddenDays.includes(date.getUTCDay())) {
                    addDay(date);
                }
                return date;
            });
            dates = get(state._viewDates);
        }

        return dates;
    });
}

function viewTitle(state) {
    return derived(
        [state.date, state._activeRange, state._intlTitle, state._dayGrid],
        ([$date, $_activeRange, $_intlTitle, $_dayGrid]) => {
            return $_dayGrid
                ? $_intlTitle.formatRange($date, $date)
                : $_intlTitle.formatRange($_activeRange.start, subtractDay(cloneDate($_activeRange.end)));
        }
    );
}

function view(state) {
    return derived([state.view, state._viewTitle, state._currentRange, state._activeRange], args => createView(...args));
}

function events(state) {
    let _events = writable([]);
    let abortController;
    let fetching = 0;
    let debounceHandle = {};
    derived(
        [state.events, state.eventSources, state._activeRange, state._fetchedRange, state.lazyFetching, state.loading],
        (values, set) => debounce(() => {
            let [$events, $eventSources, $_activeRange, $_fetchedRange, $lazyFetching, $loading] = values;
            if (!$eventSources.length) {
                set($events);
                return;
            }
            // Do not fetch if new range is within the previous one
            if (!$_fetchedRange.start || $_fetchedRange.start > $_activeRange.start || $_fetchedRange.end < $_activeRange.end || !$lazyFetching) {
                if (abortController) {
                    // Abort previous request
                    abortController.abort();
                }
                // Create new abort controller
                abortController = new AbortController();
                // Call loading hook
                if (is_function($loading) && !fetching) {
                    $loading(true);
                }
                let stopLoading = () => {
                    if (--fetching === 0 && is_function($loading)) {
                        $loading(false);
                    }
                };
                let events = [];
                // Prepare handlers
                let failure = e => stopLoading();
                let success = data => {
                    events = events.concat(createEvents(data));
                    set(events);
                    stopLoading();
                };
                // Prepare other stuff
                let startStr = toISOString($_activeRange.start);
                let endStr = toISOString($_activeRange.end);
                // Loop over event sources
                for (let source of $eventSources) {
                    if (is_function(source.events)) {
                        // Events as a function
                        let result = source.events({
                            start: toLocalDate($_activeRange.start),
                            end: toLocalDate($_activeRange.end),
                            startStr,
                            endStr
                        }, success, failure);
                        if (result !== undefined) {
                            Promise.resolve(result).then(success, failure);
                        }
                    } else {
                        // Events as a JSON feed
                        // Prepare params
                        let params = is_function(source.extraParams) ? source.extraParams() : assign({}, source.extraParams);
                        params.start = startStr;
                        params.end = endStr;
                        params = new URLSearchParams(params);
                        // Prepare fetch
                        let url = source.url, headers = {}, body;
                        if (['GET', 'HEAD'].includes(source.method)) {
                            url += (url.includes('?') ? '&' : '?') + params;
                        } else {
                            headers['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
                            body = String(params);  // Safari 10.1 doesn't convert to string automatically
                        }
                        // Do the fetch
                        fetch(url, {method: source.method, headers, body, signal: abortController.signal, credentials: 'same-origin'})
                            .then(response => response.json())
                            .then(success)
                            .catch(failure);
                    }
                    ++fetching;
                }
                // Save current range for future requests
                $_fetchedRange.start = $_activeRange.start;
                $_fetchedRange.end = $_activeRange.end;
            }
        }, debounceHandle, state._queue),
        []
    ).subscribe(_events.set);

    return _events;
}

function now() {
    return readable(createDate(), set => {
        let interval = setInterval(() => {
            set(createDate());
        }, 1000);

        return () => clearInterval(interval);
    });
}

function today(state) {
    return derived(state._now, $_now => setMidnight(cloneDate($_now)));
}

class State {
    constructor(plugins, input) {
        plugins = plugins || [];

        // Create options
        let options = createOptions(plugins);
        let parsers = createParsers(plugins);

        // Parse options
        options = parseOpts(options, parsers);
        input = parseOpts(input, parsers);

        // Create stores for options
        for (let [option, value] of Object.entries(options)) {
            this[option] = writable(value);
        }

        // Private stores
        this._queue = writable(new Map());  // debounce queue
        this._auxiliary = writable([]);  // auxiliary components
        this._dayGrid = dayGrid(this);
        this._currentRange = currentRange(this);
        this._activeRange = activeRange(this);
        this._fetchedRange = writable({start: undefined, end: undefined});
        this._events = events(this);
        this._now = now();
        this._today = today(this);
        this._intlEventTime = intlRange(this.locale, this.eventTimeFormat);
        this._intlSlotLabel = intl(this.locale, this.slotLabelFormat);
        this._intlDayHeader = intl(this.locale, this.dayHeaderFormat);
        this._intlTitle = intlRange(this.locale, this.titleFormat);
        this._bodyEl = writable(undefined);
        this._scrollable = writable(false);
        this._viewTitle = viewTitle(this);
        this._viewDates = viewDates(this);
        this._view = view(this);
        this._viewComponent = writable(undefined);
        // Resources
        this._resBgColor = writable(noop);
        this._resTxtColor = writable(noop);
        // Interaction
        this._interaction = writable({});
        this._iEvents = writable([null, null]);  // interaction events: [drag/resize, pointer]
        this._iClasses = writable(identity);  // interaction event css classes
        this._iClass = writable(undefined);  // interaction css class for entire calendar

        // Set & Get
        this._set = (key, value) => {
            if (validKey(key, this)) {
                if (parsers[key]) {
                    value = parsers[key](value);
                }
                this[key].set(value);
            }
        };
        this._get = key => validKey(key, this) ? get(this[key]) : undefined;

        // Let plugins create their private stores
        for (let plugin of plugins) {
            plugin.createStores?.(this);
        }

        if (input.view) {
            // Set initial view based on input
            this.view.set(input.view);
        }

        // Set options for each view
        let views = new Set([...keys(options.views), ...keys(input.views ?? {})]);
        for (let view of views) {
            let defOpts = mergeOpts(options, options.views[view] ?? {});
            let opts = mergeOpts(defOpts, input, input.views?.[view] ?? {});
            let component = opts.component;
            // Make sure we deal with valid opts from now on
            filterOpts(opts, this);
            // Process options
            for (let key of keys(opts)) {
                let {set, _set = set, ...rest} = this[key];

                this[key] = {
                    // Set value in all views
                    set: ['buttonText', 'theme'].includes(key)
                        ? value => {
                            if (is_function(value)) {
                                let result = value(defOpts[key]);
                                opts[key] = result;
                                set(set === _set ? result : value);
                            } else {
                                opts[key] = value;
                                set(value);
                            }
                        }
                        : value => {
                            opts[key] = value;
                            set(value);
                        },
                    _set,
                    ...rest
                };
            }
            // When view changes...
            this.view.subscribe(newView => {
                if (newView === view) {
                    // switch view component
                    this._viewComponent.set(component);
                    if (is_function(opts.viewDidMount)) {
                        tick().then(() => opts.viewDidMount(get(this._view)));
                    }
                    // update store values
                    for (let key of keys(opts)) {
                        this[key]._set(opts[key]);
                    }
                }
            });
        }
    }
}

function parseOpts(opts, parsers) {
    let result = {...opts};
    for (let key of keys(parsers)) {
        if (key in result) {
            result[key] = parsers[key](result[key]);
        }
    }
    if (opts.views) {
        result.views = {};
        for (let view of keys(opts.views)) {
            result.views[view] = parseOpts(opts.views[view], parsers);
        }
    }
    return result;
}

function mergeOpts(...args) {
    let result = {};
    for (let opts of args) {
        let override = {};
        for (let key of ['buttonText', 'theme']) {
            if (is_function(opts[key])) {
                override[key] = opts[key](result[key]);
            }
        }
        result = {
            ...result,
            ...opts,
            ...override
        };
    }
    return result;
}

function filterOpts(opts, state) {
    keys(opts)
        .filter(key => !validKey(key, state) || key == 'view')
        .forEach(key => delete opts[key]);
}

function validKey(key, state) {
    return state.hasOwnProperty(key) && key[0] !== '_';
}

/* packages/core/src/Buttons.svelte generated by Svelte v4.2.2 */

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[23] = list[i];
	return child_ctx;
}

// (52:27) 
function create_if_block_4(ctx) {
	let button_1;
	let t_value = /*$buttonText*/ ctx[5][/*button*/ ctx[23]] + "";
	let t;
	let button_1_class_value;
	let mounted;
	let dispose;

	function click_handler_1() {
		return /*click_handler_1*/ ctx[20](/*button*/ ctx[23]);
	}

	return {
		c() {
			button_1 = element("button");
			t = text(t_value);

			attr(button_1, "class", button_1_class_value = "" + (/*$theme*/ ctx[3].button + (/*$view*/ ctx[6] === /*button*/ ctx[23]
			? ' ' + /*$theme*/ ctx[3].active
			: '') + " ec-" + /*button*/ ctx[23]));
		},
		m(target, anchor) {
			insert(target, button_1, anchor);
			append(button_1, t);

			if (!mounted) {
				dispose = listen(button_1, "click", click_handler_1);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*$buttonText, buttons*/ 33 && t_value !== (t_value = /*$buttonText*/ ctx[5][/*button*/ ctx[23]] + "")) set_data(t, t_value);

			if (dirty & /*$theme, $view, buttons*/ 73 && button_1_class_value !== (button_1_class_value = "" + (/*$theme*/ ctx[3].button + (/*$view*/ ctx[6] === /*button*/ ctx[23]
			? ' ' + /*$theme*/ ctx[3].active
			: '') + " ec-" + /*button*/ ctx[23]))) {
				attr(button_1, "class", button_1_class_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(button_1);
			}

			mounted = false;
			dispose();
		}
	};
}

// (46:32) 
function create_if_block_3(ctx) {
	let button_1;
	let t_value = /*$buttonText*/ ctx[5][/*button*/ ctx[23]] + "";
	let t;
	let button_1_class_value;
	let mounted;
	let dispose;

	return {
		c() {
			button_1 = element("button");
			t = text(t_value);
			attr(button_1, "class", button_1_class_value = "" + (/*$theme*/ ctx[3].button + " ec-" + /*button*/ ctx[23]));
			button_1.disabled = /*isToday*/ ctx[1];
		},
		m(target, anchor) {
			insert(target, button_1, anchor);
			append(button_1, t);

			if (!mounted) {
				dispose = listen(button_1, "click", /*click_handler*/ ctx[19]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*$buttonText, buttons*/ 33 && t_value !== (t_value = /*$buttonText*/ ctx[5][/*button*/ ctx[23]] + "")) set_data(t, t_value);

			if (dirty & /*$theme, buttons*/ 9 && button_1_class_value !== (button_1_class_value = "" + (/*$theme*/ ctx[3].button + " ec-" + /*button*/ ctx[23]))) {
				attr(button_1, "class", button_1_class_value);
			}

			if (dirty & /*isToday*/ 2) {
				button_1.disabled = /*isToday*/ ctx[1];
			}
		},
		d(detaching) {
			if (detaching) {
				detach(button_1);
			}

			mounted = false;
			dispose();
		}
	};
}

// (39:31) 
function create_if_block_2(ctx) {
	let button_1;
	let i;
	let i_class_value;
	let button_1_class_value;
	let button_1_aria_label_value;
	let button_1_title_value;
	let mounted;
	let dispose;

	return {
		c() {
			button_1 = element("button");
			i = element("i");
			attr(i, "class", i_class_value = "" + (/*$theme*/ ctx[3].icon + " ec-" + /*button*/ ctx[23]));
			attr(button_1, "class", button_1_class_value = "" + (/*$theme*/ ctx[3].button + " ec-" + /*button*/ ctx[23]));
			attr(button_1, "aria-label", button_1_aria_label_value = /*$buttonText*/ ctx[5].next);
			attr(button_1, "title", button_1_title_value = /*$buttonText*/ ctx[5].next);
		},
		m(target, anchor) {
			insert(target, button_1, anchor);
			append(button_1, i);

			if (!mounted) {
				dispose = listen(button_1, "click", /*next*/ ctx[17]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*$theme, buttons*/ 9 && i_class_value !== (i_class_value = "" + (/*$theme*/ ctx[3].icon + " ec-" + /*button*/ ctx[23]))) {
				attr(i, "class", i_class_value);
			}

			if (dirty & /*$theme, buttons*/ 9 && button_1_class_value !== (button_1_class_value = "" + (/*$theme*/ ctx[3].button + " ec-" + /*button*/ ctx[23]))) {
				attr(button_1, "class", button_1_class_value);
			}

			if (dirty & /*$buttonText*/ 32 && button_1_aria_label_value !== (button_1_aria_label_value = /*$buttonText*/ ctx[5].next)) {
				attr(button_1, "aria-label", button_1_aria_label_value);
			}

			if (dirty & /*$buttonText*/ 32 && button_1_title_value !== (button_1_title_value = /*$buttonText*/ ctx[5].next)) {
				attr(button_1, "title", button_1_title_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(button_1);
			}

			mounted = false;
			dispose();
		}
	};
}

// (32:31) 
function create_if_block_1(ctx) {
	let button_1;
	let i;
	let i_class_value;
	let button_1_class_value;
	let button_1_aria_label_value;
	let button_1_title_value;
	let mounted;
	let dispose;

	return {
		c() {
			button_1 = element("button");
			i = element("i");
			attr(i, "class", i_class_value = "" + (/*$theme*/ ctx[3].icon + " ec-" + /*button*/ ctx[23]));
			attr(button_1, "class", button_1_class_value = "" + (/*$theme*/ ctx[3].button + " ec-" + /*button*/ ctx[23]));
			attr(button_1, "aria-label", button_1_aria_label_value = /*$buttonText*/ ctx[5].prev);
			attr(button_1, "title", button_1_title_value = /*$buttonText*/ ctx[5].prev);
		},
		m(target, anchor) {
			insert(target, button_1, anchor);
			append(button_1, i);

			if (!mounted) {
				dispose = listen(button_1, "click", /*prev*/ ctx[16]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*$theme, buttons*/ 9 && i_class_value !== (i_class_value = "" + (/*$theme*/ ctx[3].icon + " ec-" + /*button*/ ctx[23]))) {
				attr(i, "class", i_class_value);
			}

			if (dirty & /*$theme, buttons*/ 9 && button_1_class_value !== (button_1_class_value = "" + (/*$theme*/ ctx[3].button + " ec-" + /*button*/ ctx[23]))) {
				attr(button_1, "class", button_1_class_value);
			}

			if (dirty & /*$buttonText*/ 32 && button_1_aria_label_value !== (button_1_aria_label_value = /*$buttonText*/ ctx[5].prev)) {
				attr(button_1, "aria-label", button_1_aria_label_value);
			}

			if (dirty & /*$buttonText*/ 32 && button_1_title_value !== (button_1_title_value = /*$buttonText*/ ctx[5].prev)) {
				attr(button_1, "title", button_1_title_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(button_1);
			}

			mounted = false;
			dispose();
		}
	};
}

// (29:4) {#if button == 'title'}
function create_if_block$1(ctx) {
	let h2;
	let h2_class_value;
	let setContent_action;
	let mounted;
	let dispose;

	return {
		c() {
			h2 = element("h2");
			attr(h2, "class", h2_class_value = /*$theme*/ ctx[3].title);
		},
		m(target, anchor) {
			insert(target, h2, anchor);

			if (!mounted) {
				dispose = action_destroyer(setContent_action = setContent.call(null, h2, /*$_viewTitle*/ ctx[4]));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*$theme*/ 8 && h2_class_value !== (h2_class_value = /*$theme*/ ctx[3].title)) {
				attr(h2, "class", h2_class_value);
			}

			if (setContent_action && is_function(setContent_action.update) && dirty & /*$_viewTitle*/ 16) setContent_action.update.call(null, /*$_viewTitle*/ ctx[4]);
		},
		d(detaching) {
			if (detaching) {
				detach(h2);
			}

			mounted = false;
			dispose();
		}
	};
}

// (28:0) {#each buttons as button}
function create_each_block$2(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*button*/ ctx[23] == 'title') return create_if_block$1;
		if (/*button*/ ctx[23] == 'prev') return create_if_block_1;
		if (/*button*/ ctx[23] == 'next') return create_if_block_2;
		if (/*button*/ ctx[23] == 'today') return create_if_block_3;
		if (/*button*/ ctx[23] != '') return create_if_block_4;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type && current_block_type(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if (if_block) if_block.d(1);
				if_block = current_block_type && current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if (if_block) {
				if_block.d(detaching);
			}
		}
	};
}

function create_fragment$3(ctx) {
	let each_1_anchor;
	let each_value = ensure_array_like(/*buttons*/ ctx[0]);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*$theme, $_viewTitle, buttons, $buttonText, prev, next, isToday, $date, today, $view*/ 229503) {
				each_value = ensure_array_like(/*buttons*/ ctx[0]);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(each_1_anchor);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let $duration;
	let $date;
	let $hiddenDays;
	let $_currentRange;
	let $theme;
	let $_viewTitle;
	let $buttonText;
	let $view;
	let { buttons } = $$props;
	let { _currentRange, _viewTitle, buttonText, date, duration, hiddenDays, theme, view } = getContext('state');
	component_subscribe($$self, _currentRange, value => $$invalidate(18, $_currentRange = value));
	component_subscribe($$self, _viewTitle, value => $$invalidate(4, $_viewTitle = value));
	component_subscribe($$self, buttonText, value => $$invalidate(5, $buttonText = value));
	component_subscribe($$self, date, value => $$invalidate(2, $date = value));
	component_subscribe($$self, duration, value => $$invalidate(21, $duration = value));
	component_subscribe($$self, hiddenDays, value => $$invalidate(22, $hiddenDays = value));
	component_subscribe($$self, theme, value => $$invalidate(3, $theme = value));
	component_subscribe($$self, view, value => $$invalidate(6, $view = value));
	let today = setMidnight(createDate()), isToday;

	function prev() {
		let d = subtractDuration($date, $duration);

		if ($hiddenDays.length && $hiddenDays.length < 7) {
			while ($hiddenDays.includes(d.getUTCDay())) {
				subtractDay(d);
			}
		}

		set_store_value(date, $date = d, $date);
	}

	function next() {
		set_store_value(date, $date = addDuration($date, $duration), $date);
	}

	const click_handler = () => set_store_value(date, $date = cloneDate(today), $date);
	const click_handler_1 = button => set_store_value(view, $view = button, $view);

	$$self.$$set = $$props => {
		if ('buttons' in $$props) $$invalidate(0, buttons = $$props.buttons);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$_currentRange*/ 262144) {
			$$invalidate(1, isToday = today >= $_currentRange.start && today < $_currentRange.end || null);
		}
	};

	return [
		buttons,
		isToday,
		$date,
		$theme,
		$_viewTitle,
		$buttonText,
		$view,
		_currentRange,
		_viewTitle,
		buttonText,
		date,
		duration,
		hiddenDays,
		theme,
		view,
		today,
		prev,
		next,
		$_currentRange,
		click_handler,
		click_handler_1
	];
}

class Buttons extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { buttons: 0 });
	}
}

/* packages/core/src/Toolbar.svelte generated by Svelte v4.2.2 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i];
	return child_ctx;
}

// (28:16) {:else}
function create_else_block(ctx) {
	let buttons_1;
	let current;
	buttons_1 = new Buttons({ props: { buttons: /*buttons*/ ctx[8] } });

	return {
		c() {
			create_component(buttons_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(buttons_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const buttons_1_changes = {};
			if (dirty & /*sections*/ 1) buttons_1_changes.buttons = /*buttons*/ ctx[8];
			buttons_1.$set(buttons_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(buttons_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(buttons_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(buttons_1, detaching);
		}
	};
}

// (24:16) {#if buttons.length > 1}
function create_if_block(ctx) {
	let div;
	let buttons_1;
	let div_class_value;
	let current;
	buttons_1 = new Buttons({ props: { buttons: /*buttons*/ ctx[8] } });

	return {
		c() {
			div = element("div");
			create_component(buttons_1.$$.fragment);
			attr(div, "class", div_class_value = /*$theme*/ ctx[1].buttonGroup);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(buttons_1, div, null);
			current = true;
		},
		p(ctx, dirty) {
			const buttons_1_changes = {};
			if (dirty & /*sections*/ 1) buttons_1_changes.buttons = /*buttons*/ ctx[8];
			buttons_1.$set(buttons_1_changes);

			if (!current || dirty & /*$theme*/ 2 && div_class_value !== (div_class_value = /*$theme*/ ctx[1].buttonGroup)) {
				attr(div, "class", div_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(buttons_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(buttons_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_component(buttons_1);
		}
	};
}

// (23:12) {#each sections[key] as buttons}
function create_each_block_1(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*buttons*/ ctx[8].length > 1) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if_blocks[current_block_type_index].d(detaching);
		}
	};
}

// (21:4) {#each Object.keys(sections) as key}
function create_each_block$1(ctx) {
	let div;
	let t;
	let current;
	let each_value_1 = ensure_array_like(/*sections*/ ctx[0][/*key*/ ctx[5]]);
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}

			append(div, t);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*$theme, sections, Object*/ 3) {
				each_value_1 = ensure_array_like(/*sections*/ ctx[0][/*key*/ ctx[5]]);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, t);
					}
				}

				group_outros();

				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

function create_fragment$2(ctx) {
	let div;
	let div_class_value;
	let current;
	let each_value = ensure_array_like(Object.keys(/*sections*/ ctx[0]));
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", div_class_value = /*$theme*/ ctx[1].toolbar);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*sections, Object, $theme*/ 3) {
				each_value = ensure_array_like(Object.keys(/*sections*/ ctx[0]));
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (!current || dirty & /*$theme*/ 2 && div_class_value !== (div_class_value = /*$theme*/ ctx[1].toolbar)) {
				attr(div, "class", div_class_value);
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let $headerToolbar;
	let $theme;
	let { headerToolbar, theme } = getContext('state');
	component_subscribe($$self, headerToolbar, value => $$invalidate(4, $headerToolbar = value));
	component_subscribe($$self, theme, value => $$invalidate(1, $theme = value));
	let sections = { start: [], center: [], end: [] };

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*sections, $headerToolbar*/ 17) {
			{
				for (let key of Object.keys(sections)) {
					$$invalidate(0, sections[key] = $headerToolbar[key].split(' ').map(group => group.split(',')), sections);
				}
			}
		}
	};

	return [sections, $theme, headerToolbar, theme, $headerToolbar];
}

class Toolbar extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
	}
}

/* packages/core/src/Auxiliary.svelte generated by Svelte v4.2.2 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[11] = list[i];
	return child_ctx;
}

// (25:0) {#each $_auxiliary as component}
function create_each_block(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	var switch_value = /*component*/ ctx[11];

	function switch_props(ctx, dirty) {
		return {};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*$_auxiliary*/ 1 && switch_value !== (switch_value = /*component*/ ctx[11])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(switch_instance_anchor);
			}

			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let each_1_anchor;
	let current;
	let each_value = ensure_array_like(/*$_auxiliary*/ ctx[0]);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*$_auxiliary*/ 1) {
				each_value = ensure_array_like(/*$_auxiliary*/ ctx[0]);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(each_1_anchor);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let $_view;
	let $datesSet;
	let $_activeRange;
	let $_auxiliary;
	let { datesSet, _auxiliary, _activeRange, _queue, _view } = getContext('state');
	component_subscribe($$self, datesSet, value => $$invalidate(7, $datesSet = value));
	component_subscribe($$self, _auxiliary, value => $$invalidate(0, $_auxiliary = value));
	component_subscribe($$self, _activeRange, value => $$invalidate(5, $_activeRange = value));
	component_subscribe($$self, _view, value => $$invalidate(6, $_view = value));
	let debounceHandle = {};

	function runDatesSet(_activeRange) {
		if (is_function($datesSet)) {
			debounce(
				() => $datesSet({
					start: toLocalDate(_activeRange.start),
					end: toLocalDate(_activeRange.end),
					startStr: toISOString(_activeRange.start),
					endStr: toISOString(_activeRange.end),
					view: toViewWithLocalDates($_view)
				}),
				debounceHandle,
				_queue
			);
		}
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$_activeRange*/ 32) {
			// Set up datesSet callback
			runDatesSet($_activeRange);
		}
	};

	return [$_auxiliary, datesSet, _auxiliary, _activeRange, _view, $_activeRange];
}

class Auxiliary extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
	}
}

/* packages/core/src/Calendar.svelte generated by Svelte v4.2.2 */

function create_fragment(ctx) {
	let div;
	let toolbar;
	let t0;
	let switch_instance;
	let div_class_value;
	let t1;
	let auxiliary;
	let current;
	let mounted;
	let dispose;
	toolbar = new Toolbar({});
	var switch_value = /*$_viewComponent*/ ctx[4];

	function switch_props(ctx, dirty) {
		return {};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
	}

	auxiliary = new Auxiliary({});

	return {
		c() {
			div = element("div");
			create_component(toolbar.$$.fragment);
			t0 = space();
			if (switch_instance) create_component(switch_instance.$$.fragment);
			t1 = space();
			create_component(auxiliary.$$.fragment);

			attr(div, "class", div_class_value = "" + (/*$theme*/ ctx[1].calendar + " " + /*$theme*/ ctx[1].view + (/*$_scrollable*/ ctx[0]
			? ' ' + /*$theme*/ ctx[1].withScroll
			: '') + (/*$_iClass*/ ctx[2]
			? ' ' + /*$theme*/ ctx[1][/*$_iClass*/ ctx[2]]
			: '')));

			set_style(div, "height", /*$height*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(toolbar, div, null);
			append(div, t0);
			if (switch_instance) mount_component(switch_instance, div, null);
			insert(target, t1, anchor);
			mount_component(auxiliary, target, anchor);
			current = true;

			if (!mounted) {
				dispose = listen(window, "resize", /*recheckScrollable*/ ctx[14]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*$_viewComponent*/ 16 && switch_value !== (switch_value = /*$_viewComponent*/ ctx[4])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, div, null);
				} else {
					switch_instance = null;
				}
			}

			if (!current || dirty[0] & /*$theme, $_scrollable, $_iClass*/ 7 && div_class_value !== (div_class_value = "" + (/*$theme*/ ctx[1].calendar + " " + /*$theme*/ ctx[1].view + (/*$_scrollable*/ ctx[0]
			? ' ' + /*$theme*/ ctx[1].withScroll
			: '') + (/*$_iClass*/ ctx[2]
			? ' ' + /*$theme*/ ctx[1][/*$_iClass*/ ctx[2]]
			: '')))) {
				attr(div, "class", div_class_value);
			}

			if (dirty[0] & /*$height*/ 8) {
				set_style(div, "height", /*$height*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(toolbar.$$.fragment, local);
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			transition_in(auxiliary.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(toolbar.$$.fragment, local);
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			transition_out(auxiliary.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div);
				detach(t1);
			}

			destroy_component(toolbar);
			if (switch_instance) destroy_component(switch_instance);
			destroy_component(auxiliary, detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let $_bodyEl;
	let $_scrollable;
	let $_queue;
	let $_interaction;
	let $_events;
	let $theme;
	let $_iClass;
	let $height;
	let $_viewComponent;
	let { plugins = [] } = $$props;
	let { options = {} } = $$props;
	let component = get_current_component();
	let state = new State(plugins, options);
	setContext('state', state);
	let { _viewComponent, _bodyEl, _interaction, _iClass, _events, _queue, _scrollable, events, eventSources, height, theme } = state;
	component_subscribe($$self, _viewComponent, value => $$invalidate(4, $_viewComponent = value));
	component_subscribe($$self, _bodyEl, value => $$invalidate(29, $_bodyEl = value));
	component_subscribe($$self, _interaction, value => $$invalidate(31, $_interaction = value));
	component_subscribe($$self, _iClass, value => $$invalidate(2, $_iClass = value));
	component_subscribe($$self, _events, value => $$invalidate(32, $_events = value));
	component_subscribe($$self, _queue, value => $$invalidate(30, $_queue = value));
	component_subscribe($$self, _scrollable, value => $$invalidate(0, $_scrollable = value));
	component_subscribe($$self, height, value => $$invalidate(3, $height = value));
	component_subscribe($$self, theme, value => $$invalidate(1, $theme = value));

	// Reactively update options that did change
	let prevOptions = { ...options };

	function setOption(name, value) {
		state._set(name, value);
		return this;
	}

	function getOption(name) {
		let value = state._get(name);
		return value instanceof Date ? toLocalDate(value) : value;
	}

	function refetchEvents() {
		state._fetchedRange.set({ start: undefined, end: undefined });
		return this;
	}

	function getEvents() {
		return $_events.map(toEventWithLocalDates);
	}

	function getEventById(id) {
		for (let event of $_events) {
			if (event.id == id) {
				return toEventWithLocalDates(event);
			}
		}

		return null;
	}

	function addEvent(event) {
		$_events.push(createEvents([event])[0]);
		_events.set($_events);
		return this;
	}

	function updateEvent(event) {
		for (let e of $_events) {
			if (e.id == event.id) {
				assign(e, createEvents([event])[0]);
				_events.set($_events);
				break;
			}
		}

		return this;
	}

	function removeEventById(id) {
		let idx = $_events.findIndex(event => event.id == id);

		if (idx >= 0) {
			$_events.splice(idx, 1);
			_events.set($_events);
		}

		return this;
	}

	function getView() {
		return toViewWithLocalDates(get(state._view));
	}

	function unselect() {
		if ($_interaction.action) {
			$_interaction.action.unselect();
		}

		return this;
	}

	function dateFromPoint(x, y) {
		let dayEl = getElementWithPayload(x, y);
		return dayEl ? getPayload(dayEl)(y) : null;
	}

	function destroy() {
		destroy_component(component, true);
	}

	beforeUpdate(() => {
		flushDebounce($_queue);
		setTimeout(recheckScrollable);
	});

	function recheckScrollable() {
		if ($_bodyEl) {
			set_store_value(_scrollable, $_scrollable = hasYScroll($_bodyEl), $_scrollable);
		}
	}

	$$self.$$set = $$props => {
		if ('plugins' in $$props) $$invalidate(15, plugins = $$props.plugins);
		if ('options' in $$props) $$invalidate(16, options = $$props.options);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*options*/ 65536) {
			for (let [name, value] of diff(options, prevOptions)) {
				setOption(name, value);
			}
		}
	};

	return [
		$_scrollable,
		$theme,
		$_iClass,
		$height,
		$_viewComponent,
		_viewComponent,
		_bodyEl,
		_interaction,
		_iClass,
		_events,
		_queue,
		_scrollable,
		height,
		theme,
		recheckScrollable,
		plugins,
		options,
		setOption,
		getOption,
		refetchEvents,
		getEvents,
		getEventById,
		addEvent,
		updateEvent,
		removeEventById,
		getView,
		unselect,
		dateFromPoint,
		destroy
	];
}

class Calendar extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance,
			create_fragment,
			safe_not_equal,
			{
				plugins: 15,
				options: 16,
				setOption: 17,
				getOption: 18,
				refetchEvents: 19,
				getEvents: 20,
				getEventById: 21,
				addEvent: 22,
				updateEvent: 23,
				removeEventById: 24,
				getView: 25,
				unselect: 26,
				dateFromPoint: 27,
				destroy: 28
			},
			null,
			[-1, -1]
		);
	}

	get setOption() {
		return this.$$.ctx[17];
	}

	get getOption() {
		return this.$$.ctx[18];
	}

	get refetchEvents() {
		return this.$$.ctx[19];
	}

	get getEvents() {
		return this.$$.ctx[20];
	}

	get getEventById() {
		return this.$$.ctx[21];
	}

	get addEvent() {
		return this.$$.ctx[22];
	}

	get updateEvent() {
		return this.$$.ctx[23];
	}

	get removeEventById() {
		return this.$$.ctx[24];
	}

	get getView() {
		return this.$$.ctx[25];
	}

	get unselect() {
		return this.$$.ctx[26];
	}

	get dateFromPoint() {
		return this.$$.ctx[27];
	}

	get destroy() {
		return this.$$.ctx[28];
	}
}

export { DAY_IN_SECONDS, addDay, addDuration, ancestor, assign, bgEvent, btnTextDay, btnTextMonth, btnTextWeek, btnTextYear, cloneDate, cloneEvent, copyTime, createDate, createDuration, createElement, createEventChunk, createEventClasses, createEventContent, createEventSources, createEvents, createView, datesEqual, debounce, Calendar as default, eventIntersects, floor, flushDebounce, getElementWithPayload, getPayload, ghostEvent, hasPayload, hasYScroll, height, helperEvent, intl, intlRange, keyEnter, keys, max, min, nextClosestDay, noTimePart, outsideEvent, pointerEvent, prepareEventChunks, prevClosestDay, previewEvent, rect, repositionEvent, setContent, setMidnight, setPayload, sortEventChunks, subtractDay, subtractDuration, symbol, themeView, toEventWithLocalDates, toISOString, toLocalDate, toViewWithLocalDates };
