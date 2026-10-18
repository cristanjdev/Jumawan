import { create } from 'zustand';

export interface Achievement {
  title: string;
  /** Year or span shown at the right edge of the row ("2025", "8 semesters") */
  detail?: string;
  group: "Recognition" | "Leadership & activities";
}

export interface Education {
  id: number;
  degree: string;
  /** "Bachelor's degree", "Senior high school" */
  level: string;
  school: string;
  location: string;
  period: string;
  gpa: string;
  status: string;
  /** Latin honors or similar, shown with the status ("Graduated with Honors") */
  honors?: string;
  description: string;
  coursework: string[];
  achievements: Achievement[];
}

interface EducationState {
  education: Education[];
}

export const useEducationStore = create<EducationState>(() => ({
  education: [
    {
      id: 1,
      degree: "Bachelor of Science in Information Technology",
      level: "Bachelor's degree",
      school: "Liceo de Cagayan University",
      location: "Cagayan de Oro, Misamis Oriental",
      period: "2022 – 2026",
      gpa: "",
      status: "Graduated",
      honors: "With Honors",
      description: "Four-year degree covering software development, database systems, web and mobile applications, and systems analysis. Graduated with honors and was recognized as an Outstanding Intern.",
      coursework: [
        "Software Development",
        "Database Management Systems",
        "Web Technologies",
        "Mobile Application Development",
        "System Analysis & Design",
        "Network Administration"
      ],
      achievements: [
        { title: "Outstanding Intern", detail: "2026", group: "Recognition" },
        { title: "Consistent Dean's Lister", detail: "8 semesters", group: "Recognition" },
        { title: "TOPCIT Exam – Level 3", detail: "2025", group: "Recognition" },
        { title: "TOPCIT Exam – Level 2", detail: "2024", group: "Recognition" },
        { title: "Vice President, Wizardry Society", detail: "2025 – 2026", group: "Leadership & activities" },
        { title: "President, Wizardry Society", detail: "2024 – 2025", group: "Leadership & activities" },
        { title: "Participant, Hack4Gov", detail: "2024", group: "Leadership & activities" }
      ]
    },
    {
      id: 2,
      degree: "Information Communication Technology (ICT) Strand",
      level: "Senior high school",
      school: "Liceo de Cagayan University",
      location: "Cagayan de Oro, Misamis Oriental",
      period: "2020 – 2022",
      gpa: "",
      status: "Graduated",
      description: "Senior high school track in Information and Communications Technology, covering programming, web development, networking, and IT fundamentals.",
      coursework: [
        "Computer Programming",
        "Web Development",
        "Database Fundamentals",
        "Networking Basics",
        "IT Fundamentals",
        "Digital Design"
      ],
      achievements: []
    }
  ]
}));
