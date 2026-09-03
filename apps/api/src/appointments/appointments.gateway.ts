import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

/**
 * Notifica en tiempo real al dashboard admin y a otros clientes navegando
 * el calendario cuando una cita se crea o cambia de estado, para que el
 * slot recién tomado desaparezca sin necesidad de refrescar.
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3101', 'http://localhost:3102'],
  },
})
export class AppointmentsGateway {
  @WebSocketServer()
  server!: Server;

  emitAppointmentCreated(appointment: unknown) {
    this.server.emit('appointment.created', appointment);
  }

  emitAppointmentUpdated(appointment: unknown) {
    this.server.emit('appointment.updated', appointment);
  }
}
