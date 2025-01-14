export const enum EventType {
  Transaction = 'transaction',
  Diagnostics = 'diagnostics',
}

export class EventLogger {
  private static augmentEvent(event: Record<string, unknown>, eventType: EventType) {
    return Object.assign(event, { df_event_type: eventType });
  }

  logEvent(eventType: EventType, event: Record<string, unknown>) {
    if (!import.meta.env.DF_WEBSERVER_URL) {
      return;
    }

    fetch(`${import.meta.env.DF_WEBSERVER_URL}/event`, {
      method: 'POST',
      body: JSON.stringify(EventLogger.augmentEvent(event, eventType)),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((err) => console.log(err));
  }
}

export const eventLogger = new EventLogger();
