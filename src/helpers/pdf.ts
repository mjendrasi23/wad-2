import { Response } from 'express';
import { Recipe } from '../model/recipe';
const PDFDocument = require('pdfkit');

export interface FullIngredientDetail {
  ingredient_name: string;
  quantity: number;
  unit: string;
}

export const streamRecipePDF = (recipe: Recipe, ingredients: FullIngredientDetail[], res: Response): void => {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recipe-${recipe.recipe_id}.pdf"`);

    doc.pipe(res);

    doc.fontSize(28).fillColor('#2c3e50').text(recipe.title, { align: 'center' });
    doc.moveDown(1.5);

    if (ingredients.length > 0) {
      doc.fontSize(18).fillColor('#e67e22').text('Ingredients');
      doc.moveDown(0.5);

      ingredients.forEach((item) => {
        const currentY = doc.y;
        doc.fontSize(12).fillColor('#2c3e50');
        doc.text(`${item.quantity} ${item.unit}`, 70, currentY, { width: 100 });
        doc.text(item.ingredient_name, 170, currentY);
        doc.moveDown(0.2);
      });
      doc.moveDown(1.5);
    }

    doc.fontSize(18).fillColor('#e67e22').text('Instructions');
    doc.moveDown(0.5);

    const stepsArray = recipe.steps
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    stepsArray.forEach((step, index) => {
      
      
      doc.fillColor('black').font('Helvetica')
         .text(step);
      
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#f0f0f0').lineWidth(1).stroke();
      doc.moveDown(0.5);
    });

    doc.end();

  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (!res.headersSent) {
      res.status(500).send("Error generating PDF document");
    }
  }
};