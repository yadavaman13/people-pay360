import employeeRouter from './routes/employee.routes.js';
import departmentRouter from './routes/department.routes.js';
import jobPositionRouter from './routes/jobPosition.routes.js';
import * as employeeService from './services/employee.service.js';

export { employeeRouter, departmentRouter, jobPositionRouter, employeeService };
export default employeeRouter;
