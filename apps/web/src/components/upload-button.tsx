"use client";

import  { generateUploadButton } from "@uploadthing/react";
import { OurFileRouter } from '@/lib/uploadthing';

export const UploadButton = generateUploadButton<OurFileRouter>();

