import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import JSZipUtils from 'jszip-utils';

import { supabase } from '../lib/supabase';

function loadFile(url: string, callback: (err: any, data: any) => void) {
    JSZipUtils.getBinaryContent(url, callback);
}

export const generatePurchaseRequestDocx = async (data: any, items: any[], gsoid: string) => {
    const { data: { publicUrl: templatePath } } = supabase.storage.from('gais251805').getPublicUrl('PR.docx');

    return new Promise((resolve, reject) => {
        loadFile(templatePath, (error, content) => {
            if (error) {
                console.error(error);
                reject(error);
                return;
            }

            try {
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: { start: '{{', end: '}}' },
                });

                // Prepare date
                const dateObj = data.date ? new Date(data.date) : new Date();
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });

                const docData = {
                    DEPARTMENT: data.department?.toUpperCase() || '',
                    DATE: formattedDate,
                    SECTION: data.section?.toUpperCase() || '',
                    PR: data.pr || '',
                    REQUESTED_BY: data.requested_by?.toUpperCase() || '',
                    BUDGET: data.budget || '',
                    GSOID: gsoid || '',
                    BAC: data.bac || '',
                    STOCK_NO: items.map(i => i.stock_no || '').join('\n'),
                    UNIT: items.map(i => i.unit || '').join('\n'),
                    ITEM_DESCRIPTION: items.map(i => i.item_description || '').join('\n'),
                    QTY: items.map(i => i.qty || '').join('\n'),
                    UNIT_COST: items.map(i => i.unit_cost || '').join('\n'),
                    TOTAL_COST: items.map(i => i.total_cost || '').join('\n'),
                    REMARKS: data.remarks || '',
                };

                doc.setData(docData);
                doc.render();

                const out = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });

                saveAs(out, `PR_${gsoid || 'Official'}.docx`);
                resolve(true);
            } catch (err: any) {
                if (err.properties && err.properties.errors instanceof Array) {
                    const errorMessages = err.properties.errors.map((error: any) => {
                        return error.properties.explanation;
                    }).join("\n");
                    console.error("Docxtemplater Errors:", errorMessages);
                    reject(new Error(`Template Error: ${errorMessages}`));
                } else {
                    console.error("Docx Generation Error:", err);
                    reject(err);
                }
            }
        });
    });
};

export const generateRISDocx = async (data: any, items: any[], gsoid: string) => {
    const { data: { publicUrl: templatePath } } = supabase.storage.from('gais251805').getPublicUrl('RIS.docx');

    return new Promise((resolve, reject) => {
        loadFile(templatePath, (error, content) => {
            if (error) {
                console.error("Failed to load RIS template:", error);
                
                if (error.status === 400 || error.status === 404 || error.message?.includes('400')) {
                    reject(new Error("TEMPLATE NOT FOUND: The 'RIS.docx' file is missing or the 'gais251805' bucket is private in Supabase. Please ensure the bucket is public and the template is uploaded."));
                } else {
                    reject(new Error("Failed to generate DOCX. Please try again."));
                }
                return;
            }

            try {
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: { start: '{{', end: '}}' },
                });

                const dateObj = data.date ? new Date(data.date) : new Date();
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });

                const docData = {
                    DEPARTMENT: data.department?.toUpperCase() || '',
                    DATE: formattedDate,
                    REQUESTED_BY: data.requested_by?.toUpperCase() || '',
                    GSOID: gsoid || '',
                    STOCK_NO: items.map((i, idx) => i.stock_no || (idx + 1)).join('\n'),
                    UNIT: items.map(i => i.unit || '').join('\n'),
                    ITEM_DESCRIPTION: items.map(i => i.item_description || '').join('\n'),
                    QTY: items.map(i => i.qty || '').join('\n'),
                    REMARKS: items.map(i => i.remarks || '').join('\n'),
                    SECTION: data.section || '',
                };

                doc.setData(docData);
                doc.render();

                const out = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });

                saveAs(out, `RIS_${gsoid || 'Official'}.docx`);
                resolve(true);
            } catch (err: any) {
                console.error("Docx Generation Error (RIS):", err);
                reject(err);
            }
        });
    });
};
