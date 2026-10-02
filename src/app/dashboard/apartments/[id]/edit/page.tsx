"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewApartmentForm } from "@/components/dashboard/apartments/NewApartmentForm";
import { MOCK_APARTMENTS } from "@/lib/mockData/apartments";

export default function EditApartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // The data source only contains the user's apartments; unknown ids (and,
  // once BE-03 filters by owner, other users' ids) render 404.
  const apartment = MOCK_APARTMENTS.find((a) => a.id === id);
  if (!apartment) {
    notFound();
  }

  const initialData = {
    name: apartment.name,
    location: apartment.location,
  };

  const handleSubmit = () => {
    // TODO: wire to Hasura mutation → UPDATE public.apartments WHERE id = $id
    router.push("/dashboard/apartments");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Link
        href="/dashboard/apartments"
        className="flex items-center gap-2 text-sm
                   text-gray-400 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Apartments
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Apartment
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update the details for apartment #{id}
        </p>
      </div>

      <NewApartmentForm
        initialData={initialData}
        onSubmit={handleSubmit}
        title="Edit apartment"
        submitLabel="Save changes"
      />
    </div>
  );
}
