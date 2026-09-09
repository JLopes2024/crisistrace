import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const classroomPassword = process.env.CLASSROOM_PASSWORD;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL não configurada.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
}

if (!classroomPassword) {
  throw new Error("CLASSROOM_PASSWORD não configurada.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const rooms = ["A", "B", "C", "D", "E", "F", "G"];

async function createClassroom(room) {
  const email = `${room.toLowerCase()}@renapsisp.org`;

  console.log(`\nCriando sala ${room}...`);

  const { data: userData, error: userError } =
    await supabase.auth.admin.createUser({
      email,
      password: classroomPassword,
      email_confirm: true,
      user_metadata: {
        room_code: room,
        full_name: `Sala ${room}`,
      },
    });

  if (userError) {
    if (
      userError.message.toLowerCase().includes("already") ||
      userError.message.toLowerCase().includes("registered")
    ) {
      console.log(`Usuário ${email} já existe.`);
    } else {
      console.error(`Erro ao criar ${email}:`, userError.message);
      return;
    }
  } else {
    console.log(`Usuário criado: ${userData.user.email}`);
  }

  const { error: classroomError } = await supabase
    .from("classrooms")
    .upsert(
      {
        code: room,
        email,
      },
      {
        onConflict: "code",
      }
    );

  if (classroomError) {
    console.error(
      `Erro ao registrar sala ${room}:`,
      classroomError.message
    );

    return;
  }

  console.log(`Sala ${room} registrada.`);
}

async function main() {
  console.log("=== CrisisTrace - criação das salas ===");

  for (const room of rooms) {
    await createClassroom(room);
  }

  console.log("\nFinalizado.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});