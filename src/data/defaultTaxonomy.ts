import { Taxonomy } from '../types';

export const defaultTaxonomy: Taxonomy = {
  classes: [
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'HSC 1st Year', 'HSC 2nd Year'
  ],
  subjects: {
    'Class 1': ['Bangla', 'English', 'Mathematics', 'Environment Studies'],
    'Class 2': ['Bangla', 'English', 'Mathematics', 'Environment Studies'],
    'Class 3': ['Bangla', 'English', 'Mathematics', 'Science', 'Bangladesh and Global Studies', 'Religion'],
    'Class 4': ['Bangla', 'English', 'Mathematics', 'Science', 'Bangladesh and Global Studies', 'Religion'],
    'Class 5': ['Bangla', 'English', 'Mathematics', 'Science', 'Bangladesh and Global Studies', 'Religion'],
    'Class 6': ['Bangla', 'English', 'Mathematics', 'Science', 'Bangladesh and Global Studies', 'Religion', 'ICT', 'Arts and Crafts', 'Physical Education'],
    'Class 7': ['Bangla', 'English', 'Mathematics', 'Science', 'Bangladesh and Global Studies', 'Religion', 'ICT', 'Arts and Crafts', 'Physical Education'],
    'Class 8': ['Bangla', 'English', 'Mathematics', 'Science', 'Bangladesh and Global Studies', 'Religion', 'ICT'],
    'Class 9': ['Bangla', 'English', 'Mathematics', 'Higher Mathematics', 'Physics', 'Chemistry', 'Biology', 'Bangladesh and Global Studies', 'Religion', 'ICT', 'Accounting', 'Business Ent.', 'Finance & Banking', 'Geography', 'History', 'Civics'],
    'Class 10': ['Bangla', 'English', 'Mathematics', 'Higher Mathematics', 'Physics', 'Chemistry', 'Biology', 'Bangladesh and Global Studies', 'Religion', 'ICT', 'Accounting', 'Business Ent.', 'Finance & Banking', 'Geography', 'History', 'Civics'],
    'HSC 1st Year': ['Bangla', 'English', 'ICT', 'Physics', 'Chemistry', 'Biology', 'Higher Mathematics', 'Accounting', 'Business Org.', 'Finance', 'Economics', 'Geography', 'History', 'Islamic History', 'Civics', 'Logic', 'Sociology', 'Social Work', 'Psychology'],
    'HSC 2nd Year': ['Bangla', 'English', 'ICT', 'Physics', 'Chemistry', 'Biology', 'Higher Mathematics', 'Accounting', 'Business Org.', 'Finance', 'Economics', 'Geography', 'History', 'Islamic History', 'Civics', 'Logic', 'Sociology', 'Social Work', 'Psychology']
  },
  chapters: {
    'Class 10_Physics': ['Physical Quantities and Measurement', 'Motion', 'Force', 'Work, Power and Energy', 'State of Matter and Pressure', 'Effect of Heat on Matter', 'Waves and Sound', 'Reflection of Light', 'Refraction of Light', 'Static Electricity', 'Current Electricity', 'Magnetic Effect of Current', 'Modern Physics and Electronics', 'Physics to Save Life'],
    'Class 10_Chemistry': ['Concepts of Chemistry', 'States of Matter', 'Structure of Matter', 'Periodic Table', 'Chemical Bond', 'Concept of Mole and Chemical Counting', 'Chemical Reaction', 'Chemistry and Energy', 'Acid-Base Equilibrium', 'Mineral Resources: Metal-Nonmetal', 'Mineral Resources: Fossils', 'Chemistry in our Lives'],
    'Class 10_Biology': ['Lessons on Life', 'Biological Cells and Tissues', 'Cell Division', 'Bioenergetics', 'Food, Nutrition and Digestion', 'Transport in Organisms', 'Gaseous Exchange', 'Excretion in Organisms', 'Coordination in Organisms', 'Reproduction in Organisms', 'Heredity in Organisms and Evolution', 'Environment of Life', 'Organisms and Ecosystem', 'Biotechnology'],
    'Class 10_Mathematics': ['Real Number', 'Set and Function', 'Algebraic Expression', 'Exponents and Logarithms', 'Equations with one Variable', 'Lines, Angles and Triangles', 'Practical Geometry', 'Circle', 'Trigonometric Ratio', 'Distance and Elevation', 'Algebraic Ratio and Proportion', 'Linear Equations with two Variables', 'Finite Series', 'Ratio, Area and Volume of Similar Triangles', 'Area Related Theorems and Constructions', 'Mensuration', 'Statistics'],
    'Class 10_Higher Mathematics': ['Set and Function', 'Algebraic Expression', 'Geometry', 'Geometric Drawing', 'Equation', 'Inequality', 'Infinite Series', 'Trigonometry', 'Exponents and Logarithmic Function', 'Binomial Expansion', 'Coordinate Geometry', 'Vector', 'Solid Geometry', 'Probability'],
    'Class 10_ICT': ['Information and Communication Technology and our Bangladesh', 'Computer and Computer User Security', 'The Internet in My Education', 'My Textbooks on My Digital Device', 'Using Graphics and Multimedia', 'Use of Database'],
    'HSC 2nd Year_Physics': ['Thermodynamics', 'Static Electricity', 'Current Electricity', 'Magnetic Effect of Current and Magnetism', 'Electromagnetic Induction and Alternating Current', 'Geometric Optics', 'Physical Optics', 'Modern Physics', 'Atomic Model and Nuclear Physics', 'Semiconductor and Electronics', 'Astronomy']
  }
};
