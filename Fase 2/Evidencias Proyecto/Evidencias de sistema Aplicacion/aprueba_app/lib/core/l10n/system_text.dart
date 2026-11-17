import 'package:flutter/widgets.dart';

import 'l10n.dart';

const _englishSystemText = <String, String>{
  "Credenciales inválidas": "Invalid credentials",
  "Ingresa a tu cuenta": "Sign in to your account",
  "Continúa con tu racha de preparación PAES 2026.":
      "Keep your PAES 2026 preparation streak going.",
  "Correo electrónico": "Email address",
  "Contraseña": "Password",
  "Tu contraseña": "Your password",
  "Iniciando sesión...": "Signing in...",
  "Iniciar Sesión": "Sign in",
  "¿Olvidaste tu contraseña?": "Forgot your password?",
  "¿No tienes cuenta?": "Don't have an account?",
  "Regístrate aquí": "Register here",
  "Debes aceptar el tratamiento de tus datos para continuar.":
      "Accept the processing of your data to continue.",
  "Las contraseñas no coinciden.": "Passwords do not match.",
  "Error al crear la cuenta": "Could not create your account",
  "Crea tu cuenta de estudiante": "Create your student account",
  "Prepárate para la PAES con cuota diaria, medallas y grupos de estudio.":
      "Prepare for PAES with daily practice, medals and study groups.",
  "Nombre y Apellido": "Full name",
  "Ej: Sofía Morales": "E.g. Sofia Morales",
  "Mínimo 8 caracteres": "At least 8 characters",
  "Repite tu contraseña": "Confirm your password",
  "Creando cuenta...": "Creating account...",
  "Crear Cuenta Estudiante": "Create student account",
  "Acepto los términos y el tratamiento de mis datos para mi cuenta y práctica en Aprueba. Puedo eliminar mi cuenta desde Ajustes.": "I accept the terms and processing of my data for my account and practice in Aprueba. I can delete my account in Settings.",
  "¿Ya tienes cuenta?": "Already have an account?",
  "Inicia sesión aquí": "Sign in here",
  "Competencia Matemática 1 (M1)": "Mathematics 1 (M1)",
  "Competencia Matemática 2 (M2)": "Mathematics 2 (M2)",
  "Competencia Lectora": "Reading Comprehension",
  "Ciencias (Biología, Física, Química)":
      "Science (Biology, Physics, Chemistry)",
  "Historia y Ciencias Sociales": "History and Social Sciences",
  "Ciencias (Biología)": "Science (Biology)",
  "Historia y C. Soc.": "History and Social Sciences",
  "¿Omitir estos datos?": "Skip these details?",
  "Tendrás tus 10 preguntas diarias base. No se desbloquearán las 10 preguntas extra hasta completar colegio, edad y región (+5) y dirección (+5). Puedes hacerlo después en tu perfil.": "You keep your 10 base daily questions. Unlock 10 extra by completing school, age and region (+5), and address (+5). You can do this later in your profile.",
  "Completar mis datos": "Complete my details",
  "Sí, omitir por ahora": "Yes, skip for now",
  "Facsímil · Próximamente. Por ahora practicarás en formato aleatorio.": "Mock exam · Coming soon. For now, questions are presented in random order.",
  "Paso 1 de 2": "Step 1 of 2",
  "Tu contexto académico": "Your educational background",
  "Personalizamos los ensayos y cuotas según tu institución educativa.":
      "Set up your educational information and practice quota.",
  "Colegio / Liceo / Preuniversitario": "School / College / Preparatory course",
  "Ej: Instituto Nacional": "E.g. Instituto Nacional",
  "Región": "Region",
  "Omitir por ahora": "Skip for now",
  "Siguiente Paso →": "Next step →",
  "Paso 2 de 2": "Step 2 of 2",
  "Pruebas PAES que rendirás": "Your PAES tests",
  "Selecciona las asignaturas que componen tu postulación universitaria.":
      "Select the tests required for your university application.",
  "← Volver": "← Back",
  "Guardando perfil...": "Saving profile...",
  "Comenzar a Practicar 🚀": "Start practicing 🚀",
  "Crea tu nueva contraseña": "Create your new password",
  "Recupera tu acceso": "Recover your account",
  "Elige una contraseña de entre 8 y 128 caracteres.":
      "Choose a password between 8 and 128 characters.",
  "Te enviaremos un enlace para establecer una nueva contraseña.":
      "We will send you a link to set a new password.",
  "Este enlace no es válido. Solicita uno nuevo.":
      "This link is invalid. Request a new one.",
  "Nueva contraseña": "New password",
  "Procesando…": "Processing…",
  "Actualizar contraseña": "Update password",
  "Enviar enlace": "Send link",
  "Solicitar otro enlace": "Request another link",
  "Volver al inicio de sesión": "Back to sign in",
  "Invitación inválida": "Invalid invitation",
  "Solicita el enlace completo a un integrante del grupo.":
      "Ask a group member for the complete link.",
  "Te invitaron a un grupo de Aprueba": "You are invited to an Aprueba group",
  "Inicia sesión y confirma tu correo para unirte. Conservaremos la invitación en este navegador mientras completas el acceso.": "Sign in and verify your email to join. We will keep the invitation in this browser while you complete sign in.",
  "También puedes copiar el código y pegarlo en Grupos → Unirme con código en la app Android.": "You can also copy the code and paste it in Groups → Join with code in the Android app.",
  "Comprobando sesión…": "Checking session…",
  "Continuar con mi cuenta": "Continue with my account",
  "Crear una cuenta": "Create an account",
  "Esta prueba aún no tiene preguntas disponibles. Puedes mantenerla en tu plan mientras se amplía el banco.": "This test has no questions yet. You can keep it in your plan while the bank grows.",
  "Ya respondiste todas las preguntas disponibles de esta prueba.":
      "You answered all available questions for this test.",
  "Conviene reforzar: tus aciertos históricos son menores al 60%, con al menos cinco respuestas.": "Recommended for reinforcement: accuracy is below 60% with at least five answers.",
  "Aún hay pocas respuestas para orientar la recomendación. Comienza o continúa explorando esta prueba.": "Not enough answers for a recommendation yet. Start or continue exploring this test.",
  "Continúa avanzando en el banco disponible.":
      "Keep practicing with the available bank.",
  "Tu plan quedó guardado.": "Your plan was saved.",
  "Plan de estudio": "Study plan",
  "Organiza tu práctica diaria según las pruebas que preparas y tu progreso.":
      "Organize your daily practice around your tests and progress.",
  "Actualizar progreso": "Refresh progress",
  "Reintentar": "Retry",
  "Configura tu meta": "Set your goal",
  "Esta propuesta usa tus pruebas seleccionadas. Guarda los cambios para conservar tu plan.":
      "This proposal uses your selected tests. Save changes to keep your plan.",
  "Preguntas diarias (1 a 20)": "Daily questions (1 to 20)",
  "Pruebas que quieres preparar": "Tests you want to prepare",
  "Matemática M1": "Mathematics M1",
  "Matemática M2": "Mathematics M2",
  "Ciencias": "Science",
  "Historia": "History",
  "La meta organiza tu estudio; no modifica tu cuota diaria. La práctica disponible usa dificultad intermedia.": "The goal organizes your study; it does not change your daily quota. Practice uses intermediate difficulty.",
  "Guardando…": "Saving…",
  "Guardar plan": "Save plan",
  "Guarda tus cambios para actualizar las recomendaciones de abajo.":
      "Save changes to update the recommendations below.",
  "Tu objetivo de hoy": "Your goal today",
  "preguntas respondidas en las pruebas de este plan.":
      "questions answered in the tests in this plan.",
  "Avance de la meta diaria": "Daily goal progress",
  "Día de estudio:": "Study day:",
  "· Hora de Chile": "· Chile time",
  "¡Cumpliste tu meta de hoy!": "You reached today's goal!",
  "Tu cuota de hoy está agotada. Podrás continuar al comenzar un nuevo día en Chile.": "You used today's quota. You can continue at the start of a new day in Chile.",
  "No hay preguntas nuevas disponibles en las pruebas de tu plan. Puedes elegir otra prueba con contenido disponible.": "No new questions are available for your plan. You can choose another test with available content.",
  "Te proponemos responder": "We suggest answering",
  "preguntas más hoy": "more questions today",
  ", según tu cuota y el contenido disponible":
      ", based on your quota and available content",
  "Recomendaciones por prueba": "Recommendations by test",
  "Se distribuyen las preguntas pendientes empezando por las pruebas que conviene reforzar. Es una orientación basada en tus respuestas, no una evaluación de dominio ni un puntaje PAES.": "Remaining questions are allocated starting with tests that need reinforcement. This is guidance based on your answers, not a mastery assessment or PAES score.",
  "Historial:": "History:",
  "respuestas": "answers",
  ". Banco actual:": ". Current bank:",
  "respondidas.": "answered.",
  "preguntas propuestas para hoy.": "suggested questions for today.",
  "Practicar": "Practice",
  "El cumplimiento se actualiza con respuestas guardadas. No necesitas marcar tareas manualmente.": "Progress updates with saved answers. You do not need to mark tasks manually.",
  "Ver mi progreso": "View my progress",
  "Creación de cuenta y bienvenida a Aprueba":
      "Account creation and welcome to Aprueba",
  "Bienvenida a Aprueba": "Welcome to Aprueba",
  "Bienvenida a Aprueba. ¡Gracias por crear tu cuenta!":
      "Welcome to Aprueba. Thanks for creating your account!",
  "Inicio de sesión diario": "Daily sign in",
  "+1 Medalla de Bronce": "+1 Bronze Medal",
  "Regalo de un integrante de tu grupo": "Gift from a group member",
  "Regalo a integrantes de tus grupos": "Gift to your group members",
  "Canje de 5 medallas por 1 del siguiente nivel":
      "Exchange of 5 medals for 1 at the next level",
  "pending": "Pending",
  "approved": "Approved",
  "rejected": "Rejected",
  "completed": "Completed",
  "Usuario eliminado": "Deleted user",
  "free": "Free",
  "uni": "One test",
  "all": "All tests",
  "Contraseña incorrecta": "Incorrect password",
  "Tu sesión expiró. Inicia sesión nuevamente.":
      "Your session expired. Please sign in again.",
  "No se pudo renovar la sesión. Intenta nuevamente.":
      "Could not refresh your session. Please retry.",
  "La sesión cambió": "The session changed",
  "Error en la petición al servidor": "Server request failed",
};
String systemText(BuildContext context, String value) {
  if (!isEnglish(context)) return value;
  return _englishSystemText[value] ??
      value
          .replaceAllMapped(
            RegExp(r'^Inicio de sesión diario \(día (\d+) seguido\)$'),
            (m) => 'Daily sign in (${m[1]} consecutive days)',
          )
          .replaceAllMapped(
            RegExp(r'^Inicio de sesión diario · ¡Día (\d+) seguido!$'),
            (m) => 'Daily sign in · Day ${m[1]} in a row!',
          )
          .replaceFirst(
            'Respuesta correcta en ítem ',
            'Correct answer to question ',
          );
}
