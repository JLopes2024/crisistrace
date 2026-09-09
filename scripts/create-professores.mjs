import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const professorsPassword =
  process.env.PROFESSORS_PASSWORD;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL não encontrado no ambiente.",
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY não encontrado no ambiente.",
  );
}

if (!professorsPassword) {
  throw new Error(
    "PROFESSORS_PASSWORD não encontrado no ambiente.",
  );
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const email =
  "professores@renapsisp.org";

async function findUserByEmail(email) {
  let page = 1;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) {
      throw error;
    }

    const user =
      data.users.find(
        (item) =>
          item.email?.toLowerCase() ===
          email.toLowerCase(),
      );

    if (user) {
      return user;
    }

    if (
      data.users.length < 1000
    ) {
      return null;
    }

    page += 1;
  }
}

async function createOrUpdateProfessor() {
  console.log(
    "Configurando acesso PROFESSORES...",
  );

  const existingUser =
    await findUserByEmail(email);

  let userId;

  if (existingUser) {
    console.log(
      "Conta já existe. Atualizando senha...",
    );

    const {
      data,
      error,
    } =
      await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password:
            professorsPassword,
          email_confirm: true,
        },
      );

    if (error) {
      throw error;
    }

    userId = data.user.id;
  } else {
    console.log(
      "Criando conta...",
    );

    const {
      data,
      error,
    } =
      await supabase.auth.admin.createUser(
        {
          email,
          password:
            professorsPassword,
          email_confirm: true,
        },
      );

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error(
        "Usuário não retornado pelo Supabase.",
      );
    }

    userId = data.user.id;
  }

  /*
   * Mantemos PROFESSORES também na tabela
   * classrooms para que o restante da aplicação
   * consiga reconhecer esse acesso.
   */
  const {
    error: classroomError,
  } = await supabase
    .from("classrooms")
    .upsert(
      {
        code: "PROFESSORES",
        email,
      },
      {
        onConflict: "code",
      },
    );

  if (classroomError) {
    throw classroomError;
  }

  console.log("");
  console.log(
    "✓ PROFESSORES configurado.",
  );
  console.log(`Email: ${email}`);
  console.log(
    `User ID: ${userId}`,
  );
  console.log("");
  console.log(
    "Login:",
  );
  console.log(
    "Código: PROFESSORES",
  );
  console.log(
    "Senha: definida em PROFESSORS_PASSWORD",
  );
}

createOrUpdateProfessor()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(
      "Erro ao configurar PROFESSORES:",
      error,
    );

    process.exit(1);
  });