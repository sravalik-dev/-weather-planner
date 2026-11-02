const bcrypt = require('bcryptjs');
const rows = [
  ['rahul@gmail.com', '$2a$10$Wm0dUxaifubd3au4fx.BvePF70l3sZvRcRLOimu/grsfFf3pdVmnG'],
  ['jixy456@gmail.com', '$2a$10$WnlYJSANknVC/CUlhvHQL.7J725uatz/y0FQej2SHPk1.5YdNxNBq'],
  ['keerthi@gmail.com', '$2a$10$Sk6wxBnVCiB0azvwsdKo.ONdUQFhmgjcCuOU48cbLN9mwUGcVJRAq']
];
const candidates = ['Rahul@1234', 'Rahul@123', 'Rahul1234@', 'Jixy@1234', 'Keerthi@123', 'Keerthi@1234'];
for (const [email, hash] of rows) {
  console.log(email);
  for (const pw of candidates) {
    try {
      if (bcrypt.compareSync(pw, hash)) {
        console.log('MATCH', pw);
      }
    } catch (e) {
      console.log(e.message);
    }
  }
}
